"""加载并合并2018/2024两期20m样地数据，复用notebook cell 2-3的口径。"""
import geopandas as gpd
import pandas as pd

from paths import get_data_root


def load_merged_plots() -> pd.DataFrame:
    """加载并合并2018/2024两期20m样地数据,返回带碳汇增量与真实坐标的样地表。

    数据来源与合并方式:
    - Plot20m_2018.csv 与 Plot20m_2024.csv 按 ["Grid_ID", "Row", "Col", "Area_m2"]
      做 inner join(两期数据说明第8行保证同一Grid_ID代表同一空间位置,
      理论上应严格一一对应；若发现不一致会在合并前抛出异常,而非静默丢行)。
    - 合并后新增 dC = Carbon_tha_24 - Carbon_tha_18 列,表示两期碳汇变化量。
    - common_grid_20m.shp 的网格质心坐标(X, Y)按 Grid_ID 以 left join 方式
      并入结果表,坐标系为 EPSG:32650(WGS_1984_UTM_Zone_50N)。left join 是
      为了保留样地表中的全部行,即使个别Grid_ID在shapefile里缺失几何信息
      (若真的缺失,函数会在返回前显式报错,而不是让下游静默拿到NaN坐标)。

    行数取决于当前两期CSV与shapefile的交集,在当前数据集下为576行；
    若原始数据更新导致样地网格发生变化,行数可能随之改变。

    Returns:
        合并后的样地DataFrame,列包括两期原始字段(以 _18/_24 区分)、
        dC 增量列、以及真实UTM坐标列 X、Y(单位:米,EPSG:32650)。

    Raises:
        ValueError: 两期数据的 Grid_ID/Row/Col 未严格对齐,或存在样地缺失真实坐标。
    """
    data_dir = get_data_root()
    df18 = pd.read_csv(data_dir / "Plot20m_2018.csv", encoding="utf-8-sig")
    df24 = pd.read_csv(data_dir / "Plot20m_2024.csv", encoding="utf-8-sig")

    # 核验两期严格对齐(数据说明第8行:同一Grid_ID代表相同空间位置),
    # 三个字段都是merge key,同时校验避免Row/Col不一致时被merge静默丢行而非报错(对应notebook cell 3)。
    # 用显式if+raise而非assert:assert在-O/PYTHONOPTIMIZE=1下会被整体剔除,
    # 这几个是共享管线模块的核心数据完整性校验,不能因优化模式而被静默跳过。
    if not (df18["Grid_ID"].values == df24["Grid_ID"].values).all():
        raise ValueError("两期数据Grid_ID不一致，无法按行对齐合并")
    if not (df18["Row"].values == df24["Row"].values).all():
        raise ValueError("两期数据Row不一致，无法按行对齐合并")
    if not (df18["Col"].values == df24["Col"].values).all():
        raise ValueError("两期数据Col不一致，无法按行对齐合并")

    df = df18.merge(df24, on=["Grid_ID", "Row", "Col", "Area_m2"], suffixes=("_18", "_24"))
    df["dC"] = df["Carbon_tha_24"] - df["Carbon_tha_18"]

    # 网格质心坐标系: EPSG:32650 (WGS_1984_UTM_Zone_50N)
    grid_shp = gpd.read_file(data_dir / "Plot20m" / "common_grid_20m.shp")
    cen = grid_shp.geometry.centroid
    xy_real = pd.DataFrame(
        {"Grid_ID": grid_shp.Grid_ID.astype(int), "X": cen.x.values, "Y": cen.y.values}
    )
    df = df.merge(xy_real, on="Grid_ID", how="left")
    if not df["X"].notna().all():
        raise ValueError("存在样地缺失真实坐标（Grid_ID未能在shapefile中匹配到几何信息）")

    return df
