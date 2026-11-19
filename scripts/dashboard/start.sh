#!/usr/bin/env bash
# 启动知乎内容工作台看板，并自动打开浏览器。
# 用法：./scripts/dashboard/start.sh [--port 7788]
set -euo pipefail
cd "$(dirname "$0")/../.."
exec node scripts/dashboard/server.mjs --open "$@"
