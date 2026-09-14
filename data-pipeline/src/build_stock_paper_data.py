"""导出2024碳储量制图论文(Yau2026 v7)的实验数据,供英文版网站使用。

数据源是交付成果/results/下论文实验的产物CSV/PKL(全因子实验、样本量扫描、
分区RMSE、补充实验、样点布局缓存),本脚本只做聚合、翻译和格式转换,
不重新跑任何蒙特卡洛实验——数字必须与论文一致,以CSV/PKL为唯一事实来源。
"""
import json
import os
import pickle
from collections import defaultdict
from pathlib import Path

import pandas as pd

# 中文名 -> 英文名(论文Table 1/正文用词),前端只展示英文
DESIGN_EN = {
    "SMP-cLHS": "SMP-cLHS",
    "区内随机": "Zone random",
    "区内系统": "Zone systematic",
    "区内连片": "Zone contiguous",
}
METHOD_EN = {
    "E1_纯回归": "E1 Regression",
    "E2_纯IDW": "E2 IDW",
    "E3_纯克里金": "E3 Kriging",
    "E4_回归+克里金残差": "E4 Reg + Kriging",
    "E5_混合-IDW": "E5 Fusion (E1+E2)",
    "E6_混合-克里金": "E6 Fusion (E1+E3)",
    "E7_误差图加权": "E7 Pixel-wise fusion",
}

# 论文Table 5:CCER均值口径的相对误差(%,100次重复)与理论u——直接取论文发表数字
CCER_CRITERION = [
    {"n": 18, "ccerCurrent": 5.47, "e4Smp": 4.15, "e7Smp": 3.09, "e4ZoneRandom": 8.12, "theoreticalU": 12.19},
    {"n": 27, "ccerCurrent": 3.76, "e4Smp": 2.96, "e7Smp": 2.77, "e4ZoneRandom": 3.88, "theoreticalU": 9.68},
    {"n": 36, "ccerCurrent": 4.53, "e4Smp": 2.40, "e7Smp": 2.31, "e4ZoneRandom": 2.57, "theoreticalU": 8.23},
    {"n": 54, "ccerCurrent": 3.33, "e4Smp": 1.90, "e7Smp": 1.84, "e4ZoneRandom": 2.36, "theoreticalU": 6.55},
    {"n": 90, "ccerCurrent": 2.28, "e4Smp": 1.27, "e7Smp": 1.32, "e4ZoneRandom": 1.41, "theoreticalU": 4.86},
    {"n": 108, "ccerCurrent": 2.00, "e4Smp": 1.21, "e7Smp": 1.23, "e4ZoneRandom": 1.34, "theoreticalU": 4.35},
]

# 论文Table 7:单变量 vs 双变量抽样属性(E4制图RMSE, t C/ha)
SAMPLING_ATTRIBUTE = [
    {"n": 27, "ndviOnly": 14.86, "bivariate": 12.55},
    {"n": 54, "ndviOnly": 11.72, "bivariate": 11.37},
    {"n": 90, "ndviOnly": 11.04, "bivariate": 11.06},
]

# 论文§4.7:两阶段协议(SMP n=54, +200校准样地)
TWO_STAGE = {
    "n": 54,
    "calibrationSize": 200,
    "singleStageRmse": 11.37,
    "singleStageSd": 0.56,
    "twoStageRmse": 10.64,
    "twoStageSd": 0.17,
    "gainPct": 6.4,
}


def get_results_dir() -> Path:
    """解析交付成果/results/目录(论文实验产物所在),逻辑同paths.py的parents[3]推算。"""
    env = os.environ.get("CARBON_RESULTS_DIR")
    candidates = []
    if env:
        candidates.append(Path(env))
    this_file = Path(__file__).resolve()
    if len(this_file.parents) > 3:
        candidates.append(this_file.parents[3] / "交付成果" / "results")
    candidates.append(Path.cwd().parent / "交付成果" / "results")
    for c in candidates:
        if (c / "碳储量2024_全因子结果.csv").exists():
            return c
    raise FileNotFoundError(f"找不到交付成果/results目录,已尝试: {candidates}")


def export_full_factorial(results_dir: Path, out_path: Path):
    """全因子实验(3设计x7估算器x3样本量x20种子)聚合为均值±标准差。"""
    df = pd.read_csv(results_dir / "碳储量2024_全因子结果.csv")
    rows = []
    for (design, method, n), g in df.groupby(["design", "method", "n"]):
        rows.append({
            "design": DESIGN_EN[design],
            "method": METHOD_EN[method],
            "n": int(n),
            "rmseMean": round(float(g["rmse"].mean()), 2),
            "rmseSd": round(float(g["rmse"].std()), 2),
            "maeMean": round(float(g["mae"].mean()), 2),
            "r2Mean": round(float(g["r2"].mean()), 3),
        })
    rows.sort(key=lambda r: (r["n"], r["design"], r["method"]))
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def export_sweep_curves(results_dir: Path, out_path: Path):
    """样本量扫描(n=18..108,每档100次重复):按估算器和按设计两条视角。"""
    with open(results_dir / "碳储量2024_误差曲线数据.pkl", "rb") as f:
        data = pickle.load(f)

    def curves_to_en(curves: dict, name_map: dict) -> dict:
        return {
            name_map[k]: {
                "ns": [int(t[0]) for t in v],
                "rmseMean": [round(float(t[1]), 2) for t in v],
                "rmseSd": [round(float(t[2]), 2) for t in v],
            }
            for k, v in curves.items()
            if k in name_map
        }

    out = {
        "nSeeds": int(data["N_SEEDS"]),
        "byEstimator": curves_to_en(data["curves"], METHOD_EN),
        "byDesign": curves_to_en(data["design_curves"], DESIGN_EN),
    }
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


def export_zone_rmse(results_dir: Path, out_path: Path):
    """分区RMSE(n=27,9个分区,SMP与区内随机两设计下的四个融合相关估算器)。"""
    df = pd.read_csv(results_dir / "碳储量2024_分大区RMSE.csv")
    df = df[df["n"] == 27]
    keep_methods = ["E1_纯回归", "E4_回归+克里金残差", "E5_混合-IDW", "E6_混合-克里金", "E7_误差图加权"]
    df = df[df["method"].isin(keep_methods)]
    agg = df.groupby(["design", "method", "zone"], as_index=False)["rmse"].mean()
    rows = [
        {
            "design": DESIGN_EN[r["design"]],
            "method": METHOD_EN[r["method"]],
            "zone": r["zone"],
            "rmse": round(float(r["rmse"]), 1),
        }
        for _, r in agg.iterrows()
    ]
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def export_supplementary(results_dir: Path, out_path: Path):
    """补充实验:RF先验变体(从CSV聚合)+单/双变量属性+两阶段协议(论文发表数字)。"""
    df = pd.read_csv(results_dir / "碳储量2024_补充基线与RF变体.csv")
    rf = df[df["method"] == "E1_RF+光谱"]
    agg = (
        rf.groupby(["design", "n"], as_index=False)["rmse"]
        .agg(rmseMean=lambda s: round(float(s.mean()), 2), rmseSd=lambda s: round(float(s.std()), 2))
    )
    rf_variant = [
        {"design": DESIGN_EN[r["design"]], "n": int(r["n"]), "rmseMean": r["rmseMean"], "rmseSd": r["rmseSd"]}
        for _, r in agg.iterrows()
    ]
    out = {
        "samplingAttribute": SAMPLING_ATTRIBUTE,
        "rfVariant": rf_variant,
        "twoStage": TWO_STAGE,
    }
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


def export_sample_layouts(results_dir: Path, out_path: Path):
    """样点布局:每种设计在n=27/54/90下seed=0的实际选点(Grid_ID列表),供前端地图展示。"""
    with open(results_dir / "碳储量2024_误差曲线数据.pkl", "rb") as f:
        data = pickle.load(f)
    cache = data["cache"]
    # n -> 每区配额q = n/9(9个分区);只导出论文主实验的三个样本量
    target_n = [27, 54, 90]
    out: dict = defaultdict(dict)
    for (design, q, seed), idx in cache.items():
        if seed != 0:
            continue
        n = len(idx)
        if n not in target_n:
            continue
        # 缓存索引是0-based的样地序号,Grid_ID为1-based,顺序一致(见Plot20m_2024.csv)
        out[DESIGN_EN[design]][str(n)] = sorted(int(i) + 1 for i in idx)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    results_dir = get_results_dir()
    out_dir = Path(__file__).parent.parent / "output"
    out_dir.mkdir(exist_ok=True)

    export_full_factorial(results_dir, out_dir / "stock_full_factorial.json")
    print("[OK] stock_full_factorial.json")
    export_sweep_curves(results_dir, out_dir / "stock_sweep_curves.json")
    print("[OK] stock_sweep_curves.json")
    export_zone_rmse(results_dir, out_dir / "stock_zone_rmse.json")
    print("[OK] stock_zone_rmse.json")
    export_supplementary(results_dir, out_dir / "stock_supplementary.json")
    print("[OK] stock_supplementary.json")
    export_sample_layouts(results_dir, out_dir / "stock_sample_layouts.json")
    print("[OK] stock_sample_layouts.json")
    (out_dir / "stock_ccer_criterion.json").write_text(
        json.dumps(CCER_CRITERION, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print("[OK] stock_ccer_criterion.json")


if __name__ == "__main__":
    main()
