import json

import geopandas as gpd

from export_tree_crowns import export_tree_crowns_for_year
from paths import get_data_root


def test_export_tree_crowns_produces_tiles_and_overview(tmp_path):
    data_root = get_data_root()
    shp_path = str(data_root / "Plot_Tree" / "2018" / "tree_crowns_18.shp")
    out_dir = tmp_path / "2018"
    export_tree_crowns_for_year(
        year=2018,
        shp_path=shp_path,
        grid_shp_path=str(data_root / "Plot20m" / "common_grid_20m.shp"),
        out_dir=out_dir,
    )
    overview_path = out_dir / "overview.geojson"
    assert overview_path.exists()
    gj = json.loads(overview_path.read_text(encoding="utf-8"))
    assert gj["type"] == "FeatureCollection"
    assert len(gj["features"]) > 0
    # 概览层必须是WGS84经纬度范围,且精确对应塞罕坝研究区(约北纬42.40-42.41度,东经117.31-117.32度),
    # 不是宽松的"在中国范围内"检查,确保重投影方向/坐标系没有搞反。
    # 几何是MultiPolygon,coordinates[0][0]是第一个polygon的外环(点列表),
    # coordinates[0][0][0]才是该环第一个点的[lon, lat]
    lon, lat = gj["features"][0]["geometry"]["coordinates"][0][0][0]
    assert 117.30 < lon < 117.33
    assert 42.40 < lat < 42.42

    tile_files = list((out_dir / "tiles").glob("tile_*.geojson"))
    assert len(tile_files) > 0
    tile_gj = json.loads(tile_files[0].read_text(encoding="utf-8"))
    props = tile_gj["features"][0]["properties"]
    # 每棵树的关键属性字段必须保留(前端渲染挤出高度/碳储量着色需要)
    assert "top_h_m" in props
    assert "DBH" in props
    assert "Carbon_kg" in props


def test_export_tree_crowns_drops_no_trees_even_when_outside_grid_bounds(tmp_path):
    """核心守恒检验:所有分片文件的树木总数之和必须等于原始shapefile的行数,
    不允许因'质心落在576网格范围外的边缘树'被静默丢弃(已实测确认2018年有842棵这样的边缘树)。"""
    data_root = get_data_root()
    shp_path = str(data_root / "Plot_Tree" / "2018" / "tree_crowns_18.shp")
    original_count = len(gpd.read_file(shp_path))

    out_dir = tmp_path / "2018_conservation_check"
    export_tree_crowns_for_year(
        year=2018,
        shp_path=shp_path,
        grid_shp_path=str(data_root / "Plot20m" / "common_grid_20m.shp"),
        out_dir=out_dir,
    )

    total_in_tiles = 0
    for tile_file in (out_dir / "tiles").glob("tile_*.geojson"):
        gj = json.loads(tile_file.read_text(encoding="utf-8"))
        total_in_tiles += len(gj["features"])

    assert total_in_tiles == original_count, (
        f"分片总数({total_in_tiles})与原始树冠数({original_count})不一致,"
        f"说明存在树木被静默丢弃(常见原因:用了predicate='within'而非sjoin_nearest)"
    )
