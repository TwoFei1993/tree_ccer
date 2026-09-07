"""导出576个20m网格的GeoJSON,附带两期碳密度与增量属性,重投影到WGS84。

Carbon_tha_18/24 取自Plot20m_2018/2024.csv(经load_merged_plots加载),不直接解析
Carbon_tha_20m_2018/2024.tif栅格——两者同源同网格(CSV字段本身即从栅格聚合而来,
notebook cell 5已交叉核验逐格一致),直接读CSV更简单,也复用Task 3已验证的
load_merged_plots(),不需要引入rasterio的栅格读取逻辑。
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
        df[["Grid_ID", "Carbon_tha_18", "Carbon_tha_24", "dC", "NDVI", "NIRv"]],
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
