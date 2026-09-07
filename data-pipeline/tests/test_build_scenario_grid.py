"""测试k(监测样本量) x 校准集规模场景网格预计算。sys.path由conftest.py统一处理。"""
from build_scenario_grid import build_grid_scenarios


def test_build_grid_scenarios_covers_full_grid():
    scenarios = build_grid_scenarios(k_list=[30, 50], cal_sizes=[200], n_mc=20)
    assert len(scenarios) == 2  # 2 k值 x 1 校准集规模
    for sc in scenarios:
        assert "k" in sc and "cal_size" in sc
        assert "rmse_m4" in sc and "rmse_m1" in sc and "improvement_pct" in sc
        assert "sample_grid_ids" in sc  # 用于地图上画出这次抽样点位
        assert sc["rmse_m4"] > 0 and sc["rmse_m1"] > 0
        assert "corrected_surface" in sc
        assert "corrected_surface_grid_ids" in sc
        assert len(sc["corrected_surface"]) == 576  # 全域576个20m网格点
        assert len(sc["corrected_surface"]) == len(sc["corrected_surface_grid_ids"])


def test_build_grid_scenarios_m4_beats_m1_on_average():
    scenarios = build_grid_scenarios(k_list=[30], cal_sizes=[200], n_mc=100)
    sc = scenarios[0]
    assert sc["improvement_pct"] > 0
