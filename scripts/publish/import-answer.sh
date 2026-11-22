#!/bin/bash
# 知乎回答一键导入：把定稿 md（图片须为图床外链）导入问题页编辑器
# 用法：scripts/publish/import-answer.sh <定稿md路径> [问题URL]
set -e
cd "$(dirname "$0")/../.."
printf '{"md":%s,"url":%s}\n' "$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$1")" "$(node -e 'console.log(JSON.stringify(process.argv[1]||""))' "$2")" > /tmp/ego-import-args.json
exec ego-browser nodejs < scripts/publish/import-answer.mjs
