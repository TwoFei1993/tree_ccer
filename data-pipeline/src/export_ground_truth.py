"""导出101棵地面实测单木DBH数据、DBH换算公式的交叉验证评分表,
以及LiDAR估算DBH与地面实测DBH的直接IoU匹配验证结果(CCER表35要求的验证证据)。

IoU匹配验证逻辑原样移植自 交付成果/code/ground_truth_validation.py,
不做改写——该脚本用几何相交比(IoU>0.5)在LiDAR树冠图层中为每棵地面实测树
找到最佳匹配的树冠,因为两套数据的tree_id/crown_id编号体系不一致,无法直接按ID连接。
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from paths import get_data_root

TREE_PROPS = [
    "crown_id", "tree_id", "top_h_m", "area_m2", "eq_diam_m",
    "lat", "lon", "round_cm_", "species", "H_Mean", "H_Mean_95",
]


def _match_by_best_iou(field_gdf, lidar_gdf):
    """对每棵实测树,在LiDAR树冠图层中找几何重叠面积最大的树冠,返回(index, IoU)。"""
    sindex = lidar_gdf.sindex
    best_j, best_iou = [], []
    for _, row in field_gdf.iterrows():
        candidates = list(sindex.intersection(row.geometry.bounds))
        j_max, iou_max = None, 0.0
        for j in candidates:
            cand_geom = lidar_gdf.iloc[j].geometry
            inter = row.geometry.intersection(cand_geom).area
            union = row.geometry.union(cand_geom).area
            iou = inter / union if union > 0 else 0.0
            if iou > iou_max:
                iou_max, j_max = iou, j
        best_j.append(j_max)
        best_iou.append(iou_max)
    return best_j, best_iou


def _validate_against_year(field_gdf, lidar_gdf, year_label: str, iou_threshold: float = 0.5) -> dict:
    """LiDAR估算DBH vs 地面实测DBH的直接比对。对应ground_truth_validation.py的validate_against_year。"""
    best_j, best_iou = _match_by_best_iou(field_gdf, lidar_gdf)
    field_gdf = field_gdf.copy()
    field_gdf["best_j"] = best_j
    field_gdf["best_iou"] = best_iou
    matched = field_gdf[field_gdf.best_iou > iou_threshold].copy()
    matched[f"DBH_lidar_{year_label}"] = lidar_gdf.iloc[matched.best_j.astype(int)]["DBH"].values

    resid = matched[f"DBH_lidar_{year_label}"] - matched["DBH_field_cm"]
    rmse = float(np.sqrt((resid**2).mean()))
    bias = float(resid.mean())
    mean_field = float(matched["DBH_field_cm"].mean())
    rrmse = rmse / mean_field * 100
    r2 = float(1 - resid.var() / matched["DBH_field_cm"].var())

    return {
        "year": year_label,
        "n": int(len(matched)),
        "rmse": rmse,
        "bias": bias,
        "rrmse": rrmse,
        "r2": r2,
        "mean_field_cm": mean_field,
        "mean_lidar_cm": float(matched[f"DBH_lidar_{year_label}"].mean()),
    }


def export_ground_truth(out_path: Path):
    data_root = get_data_root()
    base = data_root / "DBH_model"

    trees = gpd.read_file(base / "region4_crown_with_DBH.shp")
    trees_records = trees[TREE_PROPS].to_dict(orient="records")
    # NaN在json.dumps中会变成非法的NaN token,统一转None
    for rec in trees_records:
        for k, v in rec.items():
            if isinstance(v, float) and pd.isna(v):
                rec[k] = None

    cv_results = pd.read_excel(base / "model" / "DBH_model_CV_results.xlsx")
    cv_records = cv_results.to_dict(orient="records")

    # LiDAR估算DBH vs 地面实测DBH 的直接验证(CCER表35要求的验证类型)
    field = gpd.read_file(base / "region4_crown_with_DBH.shp")
    field["DBH_field_cm"] = field["round_cm_"] / np.pi
    lidar18 = gpd.read_file(data_root / "Plot_Tree" / "2018" / "tree_crowns_18.shp")
    lidar24 = gpd.read_file(data_root / "Plot_Tree" / "2024" / "tree_crowns_24.shp")
    lidar_vs_field = [
        _validate_against_year(field, lidar18, "2018"),
        _validate_against_year(field, lidar24, "2024"),
    ]

    data = {
        "trees": trees_records,
        "cv_model_results": cv_records,
        "lidar_vs_field_validation": lidar_vs_field,
    }
    Path(out_path).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    out_path = Path(__file__).parent.parent / "output" / "ground-truth-dbh.json"
    export_ground_truth(out_path)
    print(f"[OK] 地面实测数据已导出到 {out_path}")


if __name__ == "__main__":
    main()
