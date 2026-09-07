#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../data-pipeline"
uv venv .venv
uv pip install -r requirements.txt
echo "[OK] data-pipeline .venv ready"
