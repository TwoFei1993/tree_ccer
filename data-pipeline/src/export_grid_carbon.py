"""导出576个20m网格的GeoJSON,附带2024碳密度与光谱属性,重投影到WGS84。

只导出2024年可观测信息(Carbon_tha_24/NDVI/NIRv):论文§3.5的数据边界规则
明确2018表格是2024数据反推的、作为先验会构成数据泄漏,英文版网站全部
只展示2024数据,不再导出_18与dC字段。
"""
from pathlib import Path

import geopandas as gpd

from load_data import load_merged_plots
from paths import get_data_root


def export_grid_carbon(out_path: Path):
    grid_shp = get_data_root() / "Plot20m" / "common_grid_20m.shp"
    grid = gpd.read_file(grid_shp)
    df = load_merged_plots()
    merged = grid.merge(
        df[["Grid_ID", "Carbon_tha_24", "NDVI", "NIRv"]],
        on="Grid_ID",
        how="left",
    )
    merged_wgs84 = merged.to_crs("EPSG:4326")
    merged_wgs84.to_file(out_path, driver="GeoJSON")


def main():
    out_path = Path(__file__).parent.parent / "output" / "grid-carbon.geojson"
    export_grid_carbon(out_path)
    print(f"[OK] 网格碳密度数据已导出到 {out_path}")


if __name__ == "__main__":
    main()
