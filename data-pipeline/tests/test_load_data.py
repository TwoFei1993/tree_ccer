from load_data import load_merged_plots

def test_load_merged_plots_shape_and_dc():
    df = load_merged_plots()
    assert len(df) == 576
    assert "dC" in df.columns
    # dC = Carbon_tha_24 - Carbon_tha_18，与 notebook cell 3 定义一致
    # 用一个碳汇变化不为零的样地做断言(而非iloc[0]这种可能是N_tree=0退化行的样地),
    # 确保测试真正验证了减法逻辑,不是被"0-0=0"的退化情况掩盖了潜在错误
    nonzero_rows = df[df["dC"] != 0]
    assert len(nonzero_rows) > 0
    row = nonzero_rows.iloc[0]
    assert abs(row["dC"] - (row["Carbon_tha_24"] - row["Carbon_tha_18"])) < 1e-9

def test_load_merged_plots_has_real_utm_coords():
    df = load_merged_plots()
    assert "X" in df.columns and "Y" in df.columns
    # 研究区真实UTM坐标范围（已用geopandas实测确认）
    assert df["X"].min() > 525000 and df["X"].max() < 527000
