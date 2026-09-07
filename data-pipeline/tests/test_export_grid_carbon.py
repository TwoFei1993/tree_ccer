import json

from export_grid_carbon import export_grid_carbon


def test_export_grid_carbon(tmp_path):
    out_path = tmp_path / "grid-carbon.geojson"
    export_grid_carbon(out_path)
    gj = json.loads(out_path.read_text(encoding="utf-8"))
    assert gj["type"] == "FeatureCollection"
    assert len(gj["features"]) == 576
    props = gj["features"][0]["properties"]
    assert "Carbon_tha_18" in props
    assert "Carbon_tha_24" in props
    assert "dC" in props
    assert abs(props["dC"] - (props["Carbon_tha_24"] - props["Carbon_tha_18"])) < 1e-6
