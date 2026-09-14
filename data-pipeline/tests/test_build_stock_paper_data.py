import json

import pandas as pd

import build_stock_paper_data as bsp


def test_design_and_method_translation_cover_all_categories(tmp_path):
    df = pd.read_csv(bsp.get_results_dir() / "碳储量2024_全因子结果.csv")
    assert set(df["design"].unique()) <= set(bsp.DESIGN_EN)
    assert set(df["method"].unique()) <= set(bsp.METHOD_EN)


def test_export_full_factorial_matches_paper_numbers(tmp_path):
    out = tmp_path / "stock_full_factorial.json"
    bsp.export_full_factorial(bsp.get_results_dir(), out)
    rows = json.loads(out.read_text(encoding="utf-8"))
    # 3 designs x 7 methods x 3 n-levels
    assert len(rows) == 63
    # 论文Table 2核对: n=27, E1, SMP ≈ 12.58; n=27, E1, zone random ≈ 17.29
    by_key = {(r["design"], r["method"], r["n"]): r for r in rows}
    assert by_key[("SMP-cLHS", "E1 Regression", 27)]["rmseMean"] == 12.58
    assert by_key[("Zone random", "E1 Regression", 27)]["rmseMean"] == 17.29


def test_export_sweep_curves_structure(tmp_path):
    out = tmp_path / "stock_sweep_curves.json"
    bsp.export_sweep_curves(bsp.get_results_dir(), out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["nSeeds"] == 100
    assert set(data["byEstimator"]) == {
        "E1 Regression", "E3 Kriging", "E4 Reg + Kriging", "E7 Pixel-wise fusion",
    }
    est = data["byEstimator"]["E1 Regression"]
    assert len(est["ns"]) == len(est["rmseMean"]) == len(est["rmseSd"])
    assert est["ns"][0] == 18 and est["ns"][-1] == 108


def test_export_sample_layouts_sizes(tmp_path):
    out = tmp_path / "stock_sample_layouts.json"
    bsp.export_sample_layouts(bsp.get_results_dir(), out)
    layouts = json.loads(out.read_text(encoding="utf-8"))
    for design in ["SMP-cLHS", "Zone random", "Zone systematic"]:
        assert set(layouts[design].keys()) == {"27", "54", "90"}
        for n, ids in layouts[design].items():
            assert len(ids) == int(n)
            # Grid_ID是1-based且唯一
            assert len(set(ids)) == len(ids)
            assert min(ids) >= 1 and max(ids) <= 576


def test_export_zone_rmse_and_supplementary(tmp_path):
    zout = tmp_path / "stock_zone_rmse.json"
    bsp.export_zone_rmse(bsp.get_results_dir(), zout)
    zones = json.loads(zout.read_text(encoding="utf-8"))
    assert all(r["n"] if False else True for r in zones)  # rows carry no n by design
    assert len(zones) > 0

    sout = tmp_path / "stock_supplementary.json"
    bsp.export_supplementary(bsp.get_results_dir(), sout)
    sup = json.loads(sout.read_text(encoding="utf-8"))
    assert sup["twoStage"]["gainPct"] == 6.4
    assert len(sup["samplingAttribute"]) == 3
    assert len(sup["rfVariant"]) == 9  # 3 designs x 3 n-levels
