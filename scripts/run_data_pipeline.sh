#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../data-pipeline"

PY=".venv/bin/python"
if [ ! -f "$PY" ]; then
  PY=".venv/Scripts/python.exe"
fi

echo "=== 1/4 校验环境 ==="
"$PY" -m pytest tests/ -v

echo "=== 2/4 导出树冠/网格/地面实测地理数据 ==="
"$PY" src/export_tree_crowns.py
"$PY" src/export_grid_carbon.py
"$PY" src/export_ground_truth.py

echo "=== 3/4 导出2024碳储量论文实验数据 ==="
"$PY" src/build_stock_paper_data.py

echo "=== 4/4 拷贝到前端 public/data ==="
DEST="../public/data"
mkdir -p "$DEST"
cp -r output/tree-crowns "$DEST/"
cp output/grid-carbon.geojson "$DEST/"
cp output/ground-truth-dbh.json "$DEST/"
cp output/stock_full_factorial.json "$DEST/"
cp output/stock_sweep_curves.json "$DEST/"
cp output/stock_zone_rmse.json "$DEST/"
cp output/stock_supplementary.json "$DEST/"
cp output/stock_sample_layouts.json "$DEST/"
cp output/stock_ccer_criterion.json "$DEST/"

echo "[OK] 全部数据管线运行完成,已同步到 网站/public/data/"
