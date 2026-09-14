import json

from export_grid_carbon import export_grid_carbon


def test_export_grid_carbon(tmp_path):
    out_path = tmp_path / "grid-carbon.geojson"
    export_grid_carbon(out_path)
    gj = json.loads(out_path.read_text(encoding="utf-8"))
    assert gj["type"] == "FeatureCollection"
    assert len(gj["features"]) == 576
    props = gj["features"][0]["properties"]
    # 英文版只导出2024可观测信息(论文§3.5数据边界:2018表格系反推,作先验即泄漏)
    assert "Carbon_tha_24" in props
    assert "NDVI" in props
    assert "NIRv" in props
    assert "Carbon_tha_18" not in props
    assert "dC" not in props
