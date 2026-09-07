"""测试四种先验模型配置对比场景预计算。sys.path由conftest.py统一处理。"""
from build_scenario_prior_models import build_prior_model_scenarios


def test_build_prior_model_scenarios_covers_four_configs():
    result = build_prior_model_scenarios(k_list=[30, 50], n_cal_seeds=2, n_mc=20)
    assert len(result) == 4  # 四种先验模型配置
    names = {r["config_name"] for r in result}
    assert "当前方案" in "".join(names)  # 至少包含当前方案这个baseline配置
    for r in result:
        assert "per_k" in r
        assert set(r["per_k"].keys()) == {"30", "50"}
        for k_stats in r["per_k"].values():
            assert "improvement_mean_pct" in k_stats
            assert "improvement_min_pct" in k_stats
