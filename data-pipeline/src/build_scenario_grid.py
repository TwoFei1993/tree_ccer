"""预计算 k(监测样本量) x 校准集规模 的场景网格,供前端交互面板查表切换。

复用notebook cell 47/49的验证协议:固定校准种子cal_seed=7,监测阶段k值网格来自
cell 49的_K_GRID(边际改善率扫描),校准集规模网格来自cell 46-47已测试的[150,200,250,300]。
"""
import json
from pathlib import Path

import numpy as np
from scipy.spatial.distance import cdist

from load_data import load_merged_plots
from two_stage_protocol import build_calibration, kriging_error_field, m4_two_stage

CAL_SEED = 7
N_MC_DEFAULT = 200
K_GRID_DEFAULT = [20, 30, 40, 50, 65, 80, 100, 120, 150, 180, 200]
CAL_SIZE_GRID_DEFAULT = [150, 200, 250, 300]


def build_grid_scenarios(
    k_list: list[int] = None, cal_sizes: list[int] = None, n_mc: int = N_MC_DEFAULT
) -> list[dict]:
    """对每个(k, cal_size)组合跑两阶段协议蒙特卡洛验证,返回场景字典列表。"""
    k_list = k_list or K_GRID_DEFAULT
    cal_sizes = cal_sizes or CAL_SIZE_GRID_DEFAULT

    df = load_merged_plots()
    N = len(df)
    coords = df[["X", "Y"]].values
    D_all = cdist(coords, coords)
    mu_true = df["dC"].mean()

    scenarios = []
    for cal_size in cal_sizes:
        rng_cal = np.random.default_rng(CAL_SEED)
        cal_idx = rng_cal.choice(N, cal_size, replace=False)
        field_pool = np.setdiff1d(np.arange(N), cal_idx)
        # field_pool长度 = N - cal_size,四个校准集规模对应的field_pool长度分别是
        # 576-150=426, 576-200=376, 576-250=326, 576-300=276(最小值276,不是376)
        R_all, s2, ell = build_calibration(df, cal_idx, D_all, feature_cols=["NDVI", "NIRv"])

        for k in k_list:
            if k > len(field_pool):
                continue
            ests_m4 = np.empty(n_mc)
            ests_m1 = np.empty(n_mc)
            last_idx = None
            for s in range(n_mc):
                rng = np.random.default_rng(s)
                idx = rng.choice(field_pool, k, replace=False)
                last_idx = idx
                ests_m4[s] = m4_two_stage(df, idx, R_all, s2, ell, D_all, field_pool)
                ests_m1[s] = df["dC"].values[idx].mean()

            rmse_m4 = float(np.sqrt(np.mean((ests_m4 - mu_true) ** 2)))
            rmse_m1 = float(np.sqrt(np.mean((ests_m1 - mu_true) ** 2)))
            improvement_pct = float((rmse_m1 - rmse_m4) / rmse_m1 * 100)

            # 单独为最后一次抽样(last_idx)算一次全域576点的Kriging修正曲面,
            # 供前端渲染"误差修正效果"图层(设计文档§2要求的曲面数据,不能只存标量均值)
            e_full = df["dC"].values - R_all
            corrected_surface, _, _ = kriging_error_field(last_idx, e_full, s2, ell, D_all)
            corrected_surface = R_all + corrected_surface

            scenarios.append(
                {
                    "k": int(k),
                    "cal_size": int(cal_size),
                    "sigma2": float(s2),
                    "ell_m": float(ell),
                    "rmse_m4": rmse_m4,
                    "rmse_m1": rmse_m1,
                    "improvement_pct": improvement_pct,
                    # 最后一次蒙特卡洛重复的抽样点位,供前端在地图上示意展示
                    "sample_grid_ids": df["Grid_ID"].values[last_idx].tolist(),
                    # 对应sample_grid_ids这次抽样,全域576个网格点各自的Kriging修正后碳汇增量估计值,
                    # 与df的行序一一对应,前端据此渲染修正曲面图层(设计文档§2要求)
                    "corrected_surface": corrected_surface.tolist(),
                    "corrected_surface_grid_ids": df["Grid_ID"].values.tolist(),
                }
            )
    return scenarios


def main():
    scenarios = build_grid_scenarios()
    out_path = Path(__file__).parent.parent / "output" / "scenarios_k_calsize.json"
    out_path.write_text(json.dumps(scenarios, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] 写入 {len(scenarios)} 个场景到 {out_path}")


if __name__ == "__main__":
    main()
