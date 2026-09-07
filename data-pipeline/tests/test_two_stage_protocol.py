"""测试两阶段(校准集+监测池)空间误差抽样协议。sys.path由conftest.py统一处理。"""
import numpy as np
from load_data import load_merged_plots
from two_stage_protocol import (
    loo_predict, fit_variogram_robust, empirical_variogram,
    kriging_error_field, build_calibration, m4_two_stage,
)


def test_loo_predict_shape():
    df = load_merged_plots()
    pred = loo_predict(df, ["NDVI", "NIRv"], "dC", degree=2)
    assert pred.shape == (576,)


def test_variogram_fit_returns_positive_params():
    df = load_merged_plots()
    R = loo_predict(df, ["NDVI", "NIRv"], "dC", degree=2)
    E = df["dC"].values - R
    coords = df[["X", "Y"]].values
    from scipy.spatial.distance import cdist
    D = cdist(coords, coords)
    cen, g, cnt = empirical_variogram(E, D)
    sill = E.var(ddof=0)
    sigma2, ell = fit_variogram_robust(cen, g, cnt, sill)
    assert sigma2 > 0
    assert ell > 0


def test_two_stage_calibration_and_monitoring_reduces_rmse_vs_m1():
    """核心正确性检验:两阶段M4在k=30时应明显优于M1简单随机基线(notebook结论:改善32%-57%)"""
    df = load_merged_plots()
    N = len(df)
    coords = df[["X", "Y"]].values
    from scipy.spatial.distance import cdist
    D_all = cdist(coords, coords)
    mu_true = df["dC"].mean()

    rng_cal = np.random.default_rng(7)
    cal_idx = rng_cal.choice(N, 200, replace=False)
    field_pool = np.setdiff1d(np.arange(N), cal_idx)

    R_all, s2, ell = build_calibration(df, cal_idx, D_all, feature_cols=["NDVI", "NIRv"])

    ests_m4 = np.empty(200)
    ests_m1 = np.empty(200)
    for s in range(200):
        rng = np.random.default_rng(s)
        idx = rng.choice(field_pool, 30, replace=False)
        ests_m4[s] = m4_two_stage(df, idx, R_all, s2, ell, D_all, field_pool)
        ests_m1[s] = df["dC"].values[idx].mean()

    rmse_m4 = np.sqrt(np.mean((ests_m4 - mu_true) ** 2))
    rmse_m1 = np.sqrt(np.mean((ests_m1 - mu_true) ** 2))
    improvement_pct = (rmse_m1 - rmse_m4) / rmse_m1 * 100

    assert improvement_pct > 20, f"两阶段改善幅度应显著为正,实际={improvement_pct:.1f}%"


def test_fit_variogram_robust_raises_on_all_nan_bins():
    """退化输入回归测试:样本量过小导致每个距离档配对数都不足min_pairs时,
    empirical_variogram会返回全NaN的g,此时fit_variogram_robust不应静默返回
    一个毫无意义的"拟合"结果,而应显式报错。"""
    import pytest

    rng = np.random.default_rng(0)
    z_tiny = rng.normal(size=5)
    coords_tiny = rng.normal(size=(5, 2))
    from scipy.spatial.distance import cdist
    D_tiny = cdist(coords_tiny, coords_tiny)

    # 5个点总共只有 C(5,2)=10 对,远小于默认 min_pairs=30,
    # 因此每个距离档的配对数都不足,g 应该全部是 NaN。
    cen, g, cnt = empirical_variogram(z_tiny, D_tiny)
    assert np.isnan(g).all()

    with pytest.raises(ValueError):
        fit_variogram_robust(cen, g, cnt, sill_hint=1.0)
