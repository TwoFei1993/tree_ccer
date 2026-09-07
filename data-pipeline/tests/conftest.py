"""测试共享配置:将 src/ 加入 sys.path,使各测试文件可直接 `from <module> import ...`。

集中放在这里，避免每个 test_*.py 文件重复同一段 sys.path.insert 逻辑。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
