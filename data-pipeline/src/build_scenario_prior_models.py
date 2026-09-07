"""预计算四种先验模型配置(当前方案/随机森林/结构变量两个方向)的对比场景。

原样复用notebook cell 55的_ADV_CONFIGS定义与测试协议:固定cal_size=200,
跨5个独立校准种子(cal_seed=0..4),监测阶段k∈{30,50,80,120,200}。
"""
import json
from pathlib import Path

import numpy as np
from scipy.spatial.distance import cdist
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

from load_data import load_merged_plots
from two_stage_protocol import empirical_variogram, fit_variogram_robust, m4_two_stage

RS_FEATURES = ["NDVI", "NIRv"]
STRUCT_FEATURES = ["Carbon_tha_18", "H_mean_18", "N_tree_18", "NDVI", "NIRv"]
CAL_SIZE = 200
K_LIST_DEFAULT = [30, 50, 80, 120, 200]
N_CAL_SEEDS_DEFAULT = 5
N_MC_DEFAULT = 200


def _build_calibration_generic(df, cal_idx, D_all, feats, model_fn):
    X_cal = df[feats].values[cal_idx]
    y_cal = df["dC"].values[cal_idx]
    mdl = model_fn()
    mdl.fit(X_cal, y_cal)
    R_all = mdl.predict(df[feats].values)
    e_cal = y_cal - R_all[cal_idx]
    D_cc = D_all[np.ix_(cal_idx, cal_idx)]
    cen_c, g_c, cnt_c = empirical_variogram(e_cal, D_cc)
    sill_c = max(e_cal.var(ddof=0), 1e-3)
    s2_c, l_c = fit_variogram_robust(cen_c, g_c, cnt_c, sill_c)
    return R_all, s2_c, l_c


def build_prior_model_scenarios(
    k_list: list[int] = None, n_cal_seeds: int = N_CAL_SEEDS_DEFAULT, n_mc: int = N_MC_DEFAULT
) -> list[dict]:
    """对四种先验模型配置分别算k∈k_list下的改善幅度均值/最小值(跨n_cal_seeds个校准种子)。

    原样复用notebook cell 55的_ADV_CONFIGS定义:当前方案(二次多项式+卫星光谱)、
    方向A(随机森林+卫星光谱)、方向B(二次多项式+卫星光谱+2018结构变量)、
    方向C(随机森林+卫星光谱+2018结构变量)。固定cal_size=200。
    """
    k_list = k_list or K_LIST_DEFAULT
    df = load_merged_plots()
    N = len(df)
    coords = df[["X", "Y"]].values
    D_all = cdist(coords, coords)
    mu_true = df["dC"].mean()

    configs = {
        "当前方案: 二次多项式+卫星光谱": (
            RS_FEATURES,
            lambda seed=0: make_pipeline(
                SimpleImputer(strategy="median"),
                PolynomialFeatures(2, include_bias=False),
                LinearRegression(),
            ),
        ),
        "方向A: 随机森林+卫星光谱": (
            RS_FEATURES,
            lambda seed: make_pipeline(
                SimpleImputer(strategy="median"),
                RandomForestRegressor(n_estimators=100, max_depth=3, min_samples_leaf=8, random_state=seed, n_jobs=1),
            ),
        ),
        "方向B: 二次多项式+卫星光谱+2018结构变量": (
            STRUCT_FEATURES,
            lambda seed=0: make_pipeline(
                SimpleImputer(strategy="median"),
                PolynomialFeatures(2, include_bias=False),
                LinearRegression(),
            ),
        ),
        "方向C: 随机森林+卫星光谱+2018结构变量": (
            STRUCT_FEATURES,
            lambda seed: make_pipeline(
                SimpleImputer(strategy="median"),
                RandomForestRegressor(n_estimators=100, max_depth=3, min_samples_leaf=8, random_state=seed, n_jobs=1),
            ),
        ),
    }

    # improvements[config_name][k] = list of improvement_pct across cal_seeds
    improvements = {name: {k: [] for k in k_list} for name in configs}

    for cal_seed in range(n_cal_seeds):
        rng_cal = np.random.default_rng(cal_seed)
        cal_idx = rng_cal.choice(N, CAL_SIZE, replace=False)
        field_pool = np.setdiff1d(np.arange(N), cal_idx)

        calibs = {}
        for name, (feats, model_fn) in configs.items():
            mdl_fn = (lambda seed=cal_seed, mf=model_fn: mf(seed))
            calibs[name] = _build_calibration_generic(df, cal_idx, D_all, feats, mdl_fn)

        for k in k_list:
            ests_m1 = np.empty(n_mc)
            ests_cfg = {name: np.empty(n_mc) for name in configs}
            for s in range(n_mc):
                rng = np.random.default_rng(s)
                idx = rng.choice(field_pool, k, replace=False)
                ests_m1[s] = df["dC"].values[idx].mean()
                for name in configs:
                    R_all, s2_c, l_c = calibs[name]
                    ests_cfg[name][s] = m4_two_stage(df, idx, R_all, s2_c, l_c, D_all, field_pool)
            rmse_m1 = float(np.sqrt(np.mean((ests_m1 - mu_true) ** 2)))
            for name in configs:
                rmse_cfg = float(np.sqrt(np.mean((ests_cfg[name] - mu_true) ** 2)))
                imp = (rmse_m1 - rmse_cfg) / rmse_m1 * 100
                improvements[name][k].append(imp)

    result = []
    for name in configs:
        per_k = {}
        for k in k_list:
            arr = np.array(improvements[name][k])
            per_k[str(k)] = {
                "improvement_mean_pct": float(arr.mean()),
                "improvement_min_pct": float(arr.min()),
            }
        result.append({"config_name": name, "per_k": per_k})
    return result


def main():
    result = build_prior_model_scenarios()
    out_path = Path(__file__).parent.parent / "output" / "scenarios_prior_models.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] 写入 {len(result)} 个先验模型配置场景到 {out_path}")


if __name__ == "__main__":
    main()
