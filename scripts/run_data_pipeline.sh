#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../data-pipeline"

PY=".venv/bin/python"
if [ ! -f "$PY" ]; then
  PY=".venv/Scripts/python.exe"
fi

echo "=== 1/5 校验环境 ==="
"$PY" -m pytest tests/ -v

echo "=== 2/5 生成 k x 校准集规模 场景库 ==="
"$PY" src/build_scenario_grid.py

echo "=== 3/5 生成先验模型对比场景 ==="
"$PY" src/build_scenario_prior_models.py

echo "=== 4/5 导出树冠/网格/地面实测地理数据 ==="
"$PY" src/export_tree_crowns.py
"$PY" src/export_grid_carbon.py
"$PY" src/export_ground_truth.py

echo "=== 5/5 拷贝到前端 public/data ==="
DEST="../public/data"
mkdir -p "$DEST"
cp -r output/tree-crowns "$DEST/"
cp output/grid-carbon.geojson "$DEST/"
cp output/scenarios_k_calsize.json "$DEST/"
cp output/scenarios_prior_models.json "$DEST/"
cp output/ground-truth-dbh.json "$DEST/"

echo "[OK] 全部数据管线运行完成,已同步到 网站/public/data/"
