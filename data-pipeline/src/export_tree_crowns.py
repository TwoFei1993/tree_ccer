"""导出单木树冠GeoJSON:按20m网格分片(精细层,前端按需加载) + 合并简化的全区概览层(首屏用)。

坐标从EPSG:32650重投影到WGS84,与场景库(Task 5/6)、20m网格图层共用同一坐标系,
避免三个图层叠加时出现偏移(设计文档§2要求)。

分片归属用sjoin_nearest(最近邻)而非sjoin(predicate="within"):576个20m网格的覆盖范围
(480m x 480m)比树冠数据实际范围(约505m x 505m)小,用"严格落在网格内"的判定会让边缘约
10%的树(实测2018年842/8075棵)因质心落在网格范围外而被groupby默认丢弃NaN分组时静默剔除。
用最近邻分配保证每棵树都能找到一个归属网格,不会有树在分片阶段消失。
"""
from pathlib import Path

import geopandas as gpd

from paths import get_data_root

KEEP_PROPS = ["crown_id", "tree_id", "top_h_m", "H_95_Mean", "DBH", "Carbon_kg", "area_m2"]
# 概览层只用于首屏渲染,前端(Task 13 buildTreeCrownExtrusionLayer)只读取top_h_m(挤出高度)
# 和Carbon_kg(填色),其余字段留给按需加载的分片层(KEEP_PROPS),概览层不需要携带
OVERVIEW_PROPS = ["top_h_m", "Carbon_kg"]

# 概览层简化容差(米,在重投影前的UTM坐标系下设置更直观),值越大几何越简单、文件越小。
# 实测:0.3米容差+完整KEEP_PROPS+默认坐标精度时,2018年概览层达10MB,远超2MB目标;
# 几何简化在容差>=2米后已收敛到每棵树最少顶点数(约6个点/树,量级已到底),
# 光靠加大容差无法继续压缩,故同时:(a)概览层只保留渲染实际用到的2个属性字段,
# (b)导出GeoJSON时用GDAL原生COORDINATE_PRECISION截断坐标小数位数进一步压缩体积。
# 精度取6位小数(约11厘米)而非5位(约1.1米):实测精度=5时会让约1%的树(简化后
# 本身顶点已经很少的小树冠)在坐标截断阶段进一步坍缩成不足3个不同顶点的退化多边形
# (deck.gl会打印"Polygon coordinates are malformed"警告,虽不崩溃但这些树在首屏
# 不会正确渲染);精度=6完全消除了这一退化(已用真实数据验证0处退化),
# 代价仅是文件体积从约2.3MB/2.0MB增至约2.6MB/2.1MB,增量可忽略。
OVERVIEW_SIMPLIFY_TOLERANCE_M = 2.0
OVERVIEW_COORDINATE_PRECISION = 6


def export_tree_crowns_for_year(year: int, shp_path: str, grid_shp_path: str, out_dir: Path):
    out_dir = Path(out_dir)
    tiles_dir = out_dir / "tiles"
    tiles_dir.mkdir(parents=True, exist_ok=True)

    crowns = gpd.read_file(shp_path)
    grid = gpd.read_file(grid_shp_path)
    assert crowns.crs == grid.crs, f"CRS不一致: crowns={crowns.crs}, grid={grid.crs}"
    original_count = len(crowns)

    # 按20m网格分片:每棵树归属到离其质心最近的网格(sjoin_nearest,不会丢弃网格范围外的边缘树)
    crowns_centroid = gpd.GeoDataFrame(
        {"geometry": crowns.geometry.centroid, "_orig_idx": crowns.index}, crs=crowns.crs
    )
    joined = gpd.sjoin_nearest(
        crowns_centroid, grid[["Grid_ID", "Row", "Col", "geometry"]], how="left"
    )
    # sjoin_nearest在等距离平局(tie)时可能给同一棵树匹配多行,按_orig_idx去重保留第一条
    joined = joined.drop_duplicates(subset="_orig_idx", keep="first").set_index("_orig_idx")
    crowns["Grid_ID"] = joined.reindex(crowns.index)["Grid_ID"]
    crowns["Row"] = joined.reindex(crowns.index)["Row"]
    crowns["Col"] = joined.reindex(crowns.index)["Col"]
    assert crowns["Row"].notna().all() and crowns["Col"].notna().all(), (
        "存在树木未能匹配到任何网格,sjoin_nearest不应产生这种情况,需要排查grid是否为空或CRS错误"
    )

    crowns_wgs84 = crowns.to_crs("EPSG:4326")

    total_written = 0
    for (row, col), group in crowns_wgs84.groupby(["Row", "Col"]):
        cols_to_keep = [c for c in KEEP_PROPS if c in group.columns] + ["geometry"]
        tile_path = tiles_dir / f"tile_{int(row)}_{int(col)}.geojson"
        group[cols_to_keep].to_file(tile_path, driver="GeoJSON")
        total_written += len(group)
    assert total_written == original_count, (
        f"分片总数({total_written})与原始树冠数({original_count})不一致,存在树木丢失"
    )

    # 概览层:UTM坐标系下先简化几何降低精度,再重投影,只保留渲染需要的属性字段,
    # 并用GDAL原生坐标精度截断进一步压缩体积(见OVERVIEW_*常量注释)
    crowns_simplified = crowns.copy()
    crowns_simplified["geometry"] = crowns_simplified.geometry.simplify(OVERVIEW_SIMPLIFY_TOLERANCE_M)
    overview_wgs84 = crowns_simplified.to_crs("EPSG:4326")
    overview_cols = [c for c in OVERVIEW_PROPS if c in overview_wgs84.columns] + ["geometry"]
    overview_wgs84[overview_cols].to_file(
        out_dir / "overview.geojson",
        driver="GeoJSON",
        COORDINATE_PRECISION=OVERVIEW_COORDINATE_PRECISION,
    )


def main():
    base = get_data_root()
    grid_shp = base / "Plot20m" / "common_grid_20m.shp"
    out_root = Path(__file__).parent.parent / "output" / "tree-crowns"

    for year, shp_rel in [(2018, "Plot_Tree/2018/tree_crowns_18.shp"), (2024, "Plot_Tree/2024/tree_crowns_24.shp")]:
        export_tree_crowns_for_year(
            year=year, shp_path=str(base / shp_rel), grid_shp_path=str(grid_shp), out_dir=out_root / str(year)
        )
        print(f"[OK] {year}年树冠数据已导出到 {out_root / str(year)}")


if __name__ == "__main__":
    main()
