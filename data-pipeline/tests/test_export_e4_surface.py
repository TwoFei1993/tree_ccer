import json

import numpy as np

from export_e4_surface import export_surfaces, get_results_dir


def test_export_surfaces(tmp_path):
    out_path = tmp_path / "stock_surfaces.json"
    export_surfaces(out_path)
    data = json.loads(out_path.read_text(encoding="utf-8"))
    assert data["rows"] == 24 and data["cols"] == 24
    assert data["sampleCount"] == 54
    for key in ["truth", "estimate", "error"]:
        grid = data[key]
        assert len(grid) == 24 and all(len(row) == 24 for row in grid)
    # error = |estimate - truth| 逐格一致
    est = np.array(data["estimate"])
    tru = np.array(data["truth"])
    err = np.array(data["error"])
    assert np.allclose(err, np.abs(est - tru), atol=0.02)
    # 未抽样像素RMSE须落在论文Table 2的n=54 SMP E4附近(11.37±,放宽到[10,13])
    assert 10.0 <= data["unsampledRmse"] <= 13.0
