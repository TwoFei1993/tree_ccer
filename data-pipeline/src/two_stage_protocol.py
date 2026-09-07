"""两阶段(校准集+监测池)空间误差抽样协议。

原样移植自 交付成果/code/碳汇增量空间误差抽样_完整版.ipynb
cell 19(LOO先验) / 27(经验变异函数) / 29(稳健拟合) / 32(Kriging) / 46(两阶段协议)。
函数逻辑不做改写,仅将notebook全局变量改为显式参数,便于脱离notebook环境复用。
"""
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures


def loo_predict(df: pd.DataFrame, feature_cols: list[str], target_col: str, degree: int = 2) -> np.ndarray:
    """Leave-One-Out 预测,避免遥感先验数据泄漏。对应notebook cell 19。"""
    N = len(df)
    X = df[feature_cols].values.reshape(N, -1)
    y = df[target_col].values
    pred = np.zeros(N)
    for i in range(N):
        tr = np.ones(N, dtype=bool)
        tr[i] = False
        mdl = make_pipeline(
            SimpleImputer(strategy="median"),
            PolynomialFeatures(degree, include_bias=False),
            LinearRegression(),
        )
        mdl.fit(X[tr], y[tr])
        pred[i] = mdl.predict(X[i : i + 1])[0]
    return pred


def empirical_variogram(
    z: np.ndarray, D: np.ndarray, n_bins: int = 20, max_frac: float = 0.5, min_pairs: int = 30
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """经验变异函数,按Cressie(1993)截断远距离。对应notebook cell 27。

    截断到最大距离的 max_frac 以内,是因为远距离的点对数量本身就稀疏,
    半变异估计的噪声更大、更不可靠;只统计近距离档位能保证每个bin的
    半变异估计在统计上更可信(配合下方min_pairs门槛共同过滤掉配对数不足的bin)。
    """
    md_ = D.max() * max_frac
    edges = np.linspace(0, md_, n_bins + 1)
    cen = (edges[:-1] + edges[1:]) / 2
    iu = np.triu_indices_from(D, k=1)
    dd = D[iu]
    sq = (z[iu[0]] - z[iu[1]]) ** 2
    g = np.full(n_bins, np.nan)
    cnt = np.zeros(n_bins, dtype=int)
    for i in range(n_bins):
        msk = (dd >= edges[i]) & (dd < edges[i + 1])
        cnt[i] = msk.sum()
        if cnt[i] >= min_pairs:
            g[i] = 0.5 * sq[msk].mean()
    return cen, g, cnt


def exp_variogram(h: np.ndarray, s2: float, ell: float) -> np.ndarray:
    return s2 * (1.0 - np.exp(-h / ell))


def _wsse(params: tuple[float, float], h: np.ndarray, g: np.ndarray, w: np.ndarray) -> float:
    s2, ell = params
    if s2 <= 0 or ell <= 0:
        return 1e12
    return float(np.sum(w * (g - exp_variogram(h, s2, ell)) ** 2))


def fit_variogram_robust(
    cen: np.ndarray,
    g: np.ndarray,
    cnt: np.ndarray,
    sill_hint: float,
    s2_rng: tuple[float, float] = (0.3, 2.0),
    l_rng: tuple[float, float] = (1.0, 300.0),
    n_grid: int = 80,
) -> tuple[float, float]:
    """稳健变异函数拟合:网格搜索定位全局最优,再L-BFGS-B局部refine。对应notebook cell 29。

    WSSE(加权残差平方和)曲面在(sigma2, ell)空间上不是凸的,局部优化器容易陷入
    局部极小值,所以先用粗网格搜索定位全局最优区域,再用L-BFGS-B在此基础上做
    局部精细refine才可信。用配对数cnt作为权重,是因为配对数越多的bin统计上
    越可靠,理应在拟合中占更大的话语权。

    若经验变异函数的所有分箱都是NaN(通常是样本量过小、配对数不足min_pairs门槛
    导致),网格搜索里的每个候选点WSSE都恒为0,会"并列最优"、静默选中网格里第一个
    候选点,得到一个看似正常但毫无意义的拟合结果。因此这里显式检测并报错,而不是
    让下游拿着假装合理的sigma2/ell继续跑。
    """
    ok = ~np.isnan(g)
    if ok.sum() == 0:
        raise ValueError(
            "经验变异函数所有分箱均为NaN,无法拟合协方差参数,可能是样本量过小导致配对数不足"
        )
    h, gv, w = cen[ok], g[ok], cnt[ok].astype(float)
    s2_grid = np.linspace(s2_rng[0] * sill_hint, s2_rng[1] * sill_hint, n_grid)
    l_grid = np.linspace(l_rng[0], l_rng[1], n_grid)
    best = (np.inf, None)
    for s2 in s2_grid:
        for ell in l_grid:
            v = _wsse((s2, ell), h, gv, w)
            if v < best[0]:
                best = (v, (s2, ell))
    res = minimize(
        _wsse, best[1], args=(h, gv, w), bounds=[(1e-9, None), (1e-9, None)], method="L-BFGS-B"
    )
    return res.x[0], res.x[1]


def kriging_error_field(
    sample_idx: np.ndarray,
    E_field: np.ndarray,
    sigma2: float,
    ell: float,
    D_matrix: np.ndarray,
    jitter: float = 1e-6,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """向量化Kriging误差场重建。对应notebook cell 32。

    一次性求解 Σ_S·Λ=C_AS^T 得到全部预测点相对采样点的权重矩阵Λ,而不是对每个
    预测点单独调用solve——两者数学等价,但向量化版本避免了O(N)次k×k线性求解,
    在N=576、k up to 200、上百次蒙特卡洛重复的量级下是必要的性能优化。
    """
    k = len(sample_idx)
    D_ss = D_matrix[np.ix_(sample_idx, sample_idx)]
    D_as = D_matrix[:, sample_idx]
    # jitter是数值正则化项(nugget/ridge),加在协方差矩阵对角线上,
    # 避免C_ss在数值上接近奇异而无法求逆/求解。
    C_ss = sigma2 * np.exp(-D_ss / ell) + np.eye(k) * jitter
    C_as = sigma2 * np.exp(-D_as / ell)
    Lam = np.linalg.solve(C_ss, C_as.T)
    E_pred = Lam.T @ E_field[sample_idx]
    krig_var = sigma2 - np.einsum("ij,ji->i", C_as, Lam)
    return E_pred, krig_var, Lam


def build_calibration(df: pd.DataFrame, cal_idx: np.ndarray, D_all: np.ndarray, feature_cols: list[str]):
    """校准阶段:仅用校准集训练遥感先验+拟合空间协方差参数。对应notebook cell 46 build_calibration。"""
    X_cal = df[feature_cols].values[cal_idx]
    y_cal = df["dC"].values[cal_idx]
    mdl = make_pipeline(
        SimpleImputer(strategy="median"),
        PolynomialFeatures(2, include_bias=False),
        LinearRegression(),
    )
    mdl.fit(X_cal, y_cal)
    R_all = mdl.predict(df[feature_cols].values)
    e_cal = y_cal - R_all[cal_idx]
    D_cc = D_all[np.ix_(cal_idx, cal_idx)]
    cen_c, g_c, cnt_c = empirical_variogram(e_cal, D_cc)
    sill_c = max(e_cal.var(ddof=0), 1e-3)
    s2_c, l_c = fit_variogram_robust(cen_c, g_c, cnt_c, sill_c)
    return R_all, s2_c, l_c


def m4_two_stage(
    df: pd.DataFrame,
    idx: np.ndarray,
    R_all_cal: np.ndarray,
    s2_c: float,
    l_c: float,
    D_all: np.ndarray,
    field_pool: np.ndarray,
) -> float:
    """监测阶段:用校准好的先验+协方差参数,仅对本次抽到的idx做Kriging修正,
    最终估计只对field_pool(监测池)取平均,不夹带校准集真值。对应notebook cell 46 M4_two_stage。

    此处的field_pool-only averaging是notebook中修复过的数据泄漏bug的关键:
    若改为对全部N个点取平均,会把校准集(训练R_all_cal所用、其在校准点上残差均值
    恒为0的那部分点)的精确真值悄悄混入最终估计,使改善幅度虚高且不代表真实抽样
    不确定性。因此这里必须严格保持对field_pool取平均,不做改写。
    """
    e_full = df["dC"].values - R_all_cal
    Ep, _, _ = kriging_error_field(idx, e_full, s2_c, l_c, D_all)
    vals = R_all_cal + Ep
    return vals[field_pool].mean()
