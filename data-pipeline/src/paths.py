"""解析原始数据根目录(数据/),不硬编码任何开发者本机的绝对路径。

原始数据(shapefile/csv/notebook)存放在本仓库(网站/)之外的上级目录结构里,
按优先级尝试几个候选相对位置(仿照notebook cell 2的CANDS回退逻辑),
找到第一个存在Plot20m_2018.csv的目录即视为数据根目录。也支持用环境变量
CARBON_RESEARCH_DATA_DIR显式指定,便于CI或不同开发者按自己的checkout位置配置。
"""
import os
from pathlib import Path

_MARKER_FILE = "Plot20m_2018.csv"


def get_data_root() -> Path:
    """解析并返回原始数据根目录(即包含 Plot20m_2018.csv 等文件的"数据/"目录)。

    优先级从高到低:
    1. 环境变量 CARBON_RESEARCH_DATA_DIR(显式指定,始终优先尝试)
    2. 相对本仓库结构推算的候选路径(<repo_root>/数据,见下方parents[3]说明)
    3. 当前工作目录及其父目录下的"数据"子目录(兜底候选)

    找到第一个存在 Plot20m_2018.csv 的候选目录即返回。若全部候选均未命中,
    抛出 FileNotFoundError 并列出已尝试路径。

    Returns:
        数据根目录的绝对路径。

    Raises:
        FileNotFoundError: 所有候选路径下都找不到标记文件。
    """
    env_override = os.environ.get("CARBON_RESEARCH_DATA_DIR")
    candidates = []
    if env_override:
        candidates.append(Path(env_override))

    this_file = Path(__file__).resolve()
    # 本文件路径: <repo_root>/网站/data-pipeline/src/paths.py
    # 数据目录相对本仓库根目录的位置: <repo_root>/../数据 (即"傅老师研究/数据")
    # parents[3]: src(0) -> data-pipeline(1) -> 网站(2) -> 傅老师研究(3,即repo_root的父目录)
    # 若本文件被移动到不同目录深度,parents[3]可能越界(IndexError)。
    # 这里显式判断长度再访问,避免在检查任何候选(包括env_override这个逃生舱)之前就崩溃。
    if len(this_file.parents) > 3:
        repo_root = this_file.parents[3]
        candidates.append(repo_root / "数据")
    # 否则跳过这个基于目录深度推算的候选,依赖env_override或下面的cwd兜底候选。

    candidates.append(Path.cwd() / "数据")
    candidates.append(Path.cwd().parent / "数据")

    for candidate in candidates:
        if (candidate / _MARKER_FILE).exists():
            return candidate

    raise FileNotFoundError(
        f"找不到数据根目录(未在任何候选路径下发现 {_MARKER_FILE})。"
        f"请设置环境变量 CARBON_RESEARCH_DATA_DIR 指向包含该文件的目录。"
        f"已尝试: {candidates}"
    )
