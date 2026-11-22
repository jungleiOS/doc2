#!/bin/bash
# 捞自己已发布回答的链接：打开问题页，定位「编辑回答」所在卡片，输出 answer 永久链接
# 用法：scripts/publish/fetch-answer-url.sh <问题URL>
set -e
cd "$(dirname "$0")/../.."
printf '{"url":%s}\n' "$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$1")" > /tmp/ego-fetch-args.json
exec ego-browser nodejs < scripts/publish/fetch-answer-url.mjs
