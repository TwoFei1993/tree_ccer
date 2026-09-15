"""导出论文图13(E4三维曲面,n=54 SMP seed=0)的网格数据,供前端deck.gl交互渲染。

复刻交付成果/code/generate_figures_english.py Fig 13与nb2024_src_b.py的E4逻辑:
二次回归先验(NDVI+NIRv) + 块金指数变异函数拟合 + 残差简单克里金,已知像素用
LiDAR真值覆盖(finalize)。样点布局直接取自碳储量2024_误差曲线数据.pkl的抽样缓存
('SMP-cLHS', q=6, seed=0),与论文实验同一批选点。误差曲面 = |estimate − truth|
(论文图13用的就是绝对误差,z轴0-35)。
"""
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.spatial.distance import cdist

from load_data import load_merged_plots
from paths import get_data_root


def empirical_variogram(z: np.ndarray, D: np.ndarray, n_bins: int, max_frac=0.5, min_pairs=3):
    md_ = D.max() * max_frac
    edges = np.linspace(0, md_, n_bins + 1)
    cen = (edges[:-1] + edges[1:]) / 2
    iu = np.triu_indices_from(D, k=1)
    dd, sq = D[iu], (z[iu[0]] - z[iu[1]]) ** 2
    g = np.full(n_bins, np.nan)
    cnt = np.zeros(n_bins, dtype=int)
    for i in range(n_bins):
        msk = (dd >= edges[i]) & (dd < edges[i + 1])
        cnt[i] = msk.sum()
        if cnt[i] >= min_pairs:
            g[i] = 0.5 * sq[msk].mean()
    return cen, g, cnt


def _nugget_exp_vario(h, tau2, s2, l):
    return tau2 + s2 * (1.0 - np.exp(-h / l))


def _wsse3(p, h, g, w):
    tau2, s2, l = p
    if min(tau2, s2) < 0 or l <= 0:
        return 1e12
    return float(np.sum(w * (g - _nugget_exp_vario(h, tau2, s2, l)) ** 2))


def fit_variogram_robust(cen, g, cnt, sill_hint, n_tau=6, n_s2=40, n_l=30):
    ok = ~np.isnan(g)
    if ok.sum() < 3:
        return 0.0, max(sill_hint, 1e-3), 20.0
    h, gv, w = cen[ok], g[ok], cnt[ok].astype(float)
    best = (np.inf, (0.0, max(sill_hint, 1e-3), 20.0))
    for tau2 in np.linspace(0.0, 0.6 * sill_hint, n_tau):
        for s2 in np.linspace(0.2 * sill_hint, 1.4 * sill_hint, n_s2):
            for l in np.linspace(5.0, 150.0, n_l):
                v = _wsse3((tau2, s2, l), h, gv, w)
                if v < best[0]:
                    best = (v, (tau2, s2, l))
    res = minimize(_wsse3, best[1], args=(h, gv, w),
                   bounds=[(0.0, None), (0.0, None), (1e-3, None)], method="L-BFGS-B")
    p = res.x if np.all(np.isfinite(res.x)) and res.x[2] > 0 else best[1]
    tau2, s2, l = float(p[0]), float(p[1]), float(p[2])
    if not (np.isfinite(tau2) and np.isfinite(s2) and np.isfinite(l) and l > 0):
        return 0.0, max(sill_hint, 1e-3), 20.0
    return tau2, s2, l


def make_quadratic_pipeline():
    from sklearn.linear_model import LinearRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import PolynomialFeatures
    return make_pipeline(PolynomialFeatures(2, include_bias=False), LinearRegression())


def build_e4_surface(df: pd.DataFrame, idx: np.ndarray) -> np.ndarray:
    """E4 = NDVI+NIRv二次回归先验 + 残差简单克里金;已知像素用真值覆盖(finalize)。"""
    y_true = df["Carbon_tha_24"].values
    x_all = df[["NDVI", "NIRv"]].values
    d_all = cdist(df[["X", "Y"]].values, df[["X", "Y"]].values)

    mdl = make_quadratic_pipeline()
    mdl.fit(x_all[idx], y_true[idx])
    r = mdl.predict(x_all)
    resid = y_true[idx] - r[idx]

    d_sub = d_all[np.ix_(idx, idx)]
    cen, g, cnt = empirical_variogram(resid, d_sub, n_bins=max(4, len(idx) // 8))
    tau2, s2, l = fit_variogram_robust(cen, g, cnt, max(resid.var(ddof=0), 1e-3))

    c_ss = s2 * np.exp(-d_sub / l) + np.eye(len(idx)) * (tau2 + 1e-6)
    c_as = s2 * np.exp(-d_all[:, idx] / l)
    lam = np.linalg.solve(c_ss, c_as.T)
    est = r + lam.T @ resid

    est[idx] = y_true[idx]  # finalize
    return est


def get_results_dir() -> Path:
    import os
    env = os.environ.get("CARBON_RESULTS_DIR")
    candidates = []
    if env:
        candidates.append(Path(env))
    this_file = Path(__file__).resolve()
    if len(this_file.parents) > 3:
        candidates.append(this_file.parents[3] / "交付成果" / "results")
    candidates.append(Path.cwd().parent / "交付成果" / "results")
    for c in candidates:
        if (c / "碳储量2024_误差曲线数据.pkl").exists():
            return c
    raise FileNotFoundError(f"找不到交付成果/results目录,已尝试: {candidates}")


def export_surfaces(out_path: Path):
    results_dir = get_results_dir()
    with open(results_dir / "碳储量2024_误差曲线数据.pkl", "rb") as f:
        payload = pickle.load(f)
    cache = payload["cache"]  # pkl顶层是{curves, design_curves, N_SEEDS, Q_LEVELS, cache}
    idx54 = np.asarray(cache[("SMP-cLHS", 6, 0)], dtype=int)
    assert len(idx54) == 54

    df = load_merged_plots()
    truth = df["Carbon_tha_24"].values
    estimate = build_e4_surface(df, idx54)
    error = np.abs(estimate - truth)

    n_rows, n_cols = int(df["Row"].max()), int(df["Col"].max())
    assert n_rows * n_cols == len(df)

    def to_grid(v: np.ndarray) -> list[list[float]]:
        return [[round(float(v[r * n_cols + c]), 2) for c in range(n_cols)] for r in range(n_rows)]

    # 未抽样像素RMSE与论文Table 2核对(n=54 SMP E4 ≈ 11.4)
    mask = np.ones(len(df), bool)
    mask[idx54] = False
    rmse_unsampled = float(np.sqrt(((estimate[mask] - truth[mask]) ** 2).mean()))

    out = {
        "rows": n_rows,
        "cols": n_cols,
        "cellSizeM": 20,
        "sampleCount": int(len(idx54)),
        "unsampledRmse": round(rmse_unsampled, 2),
        "truth": to_grid(truth),
        "estimate": to_grid(estimate),
        "error": to_grid(error),
    }
    out_path.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    out_path = Path(__file__).parent.parent / "output" / "stock_surfaces.json"
    export_surfaces(out_path)
    print(f"[OK] E4曲面数据已导出到 {out_path}")
