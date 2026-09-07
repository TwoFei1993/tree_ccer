import json

from export_ground_truth import export_ground_truth


def test_export_ground_truth(tmp_path):
    out_path = tmp_path / "ground-truth-dbh.json"
    export_ground_truth(out_path)
    data = json.loads(out_path.read_text(encoding="utf-8"))
    assert len(data["trees"]) == 101
    tree = data["trees"][0]
    assert "lat" in tree and "lon" in tree
    assert "round_cm_" in tree  # 地面实测胸围原始字段
    assert "top_h_m" in tree

    # DBH换算公式本身的交叉验证评分(4个候选模型)
    assert len(data["cv_model_results"]) == 4
    best = min(data["cv_model_results"], key=lambda r: r["rRMSE_percent"])
    assert best["rRMSE_percent"] < 10  # CCER表35的10%阈值

    # LiDAR估算DBH vs 地面实测DBH的直接IoU匹配验证(2018/2024两组)
    assert len(data["lidar_vs_field_validation"]) == 2
    years = {r["year"] for r in data["lidar_vs_field_validation"]}
    assert years == {"2018", "2024"}
    for r in data["lidar_vs_field_validation"]:
        assert "rrmse" in r and "n" in r and "rmse" in r
        assert r["rrmse"] < 10  # 两组都应满足CCER表35的10%阈值(据notebook/研究报告已验证结论)
