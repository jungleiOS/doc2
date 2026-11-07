#!/bin/bash
# 知乎每日自动化：抓点赞用户 → 出报告 → 回赞（上限 20 人）→ 回采表现数据。
# 由 ~/Library/LaunchAgents/com.zhihu.daily-engage.plist 每天 21:47 触发。
# 前提：ego-browser 的知乎登录态有效；机器处于唤醒状态。
# 风控约束：回赞上限 20 人/天（engage 内置 25，这里再收紧）；
#           登录态失效（抓到 0 人）立即中止并弹通知，不硬跑。
set -uo pipefail

REPO="/Users/jiangjun/Documents/kimi/Workspaces/zhihu"
cd "$REPO" || exit 1

mkdir -p data/raw/liker-scan analytics/liker-scan
LOG="data/raw/liker-scan/cron-$(date +%F).log"
exec >>"$LOG" 2>&1

echo "===== daily-engage start $(date '+%F %T') ====="

# macOS 通知（失败告警用）
notify() {
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

# 1. 抓取（2 天窗口）
FETCH_OUT=$(node scripts/liker-scan/fetch-likers.mjs) || {
  echo "fetch 失败，中止：$FETCH_OUT"
  notify "知乎每日任务" "fetch-likers 失败，详见 $LOG"
  exit 1
}
echo "$FETCH_OUT"
TOTAL=$(echo "$FETCH_OUT" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)
if [ "${TOTAL:-0}" -eq 0 ]; then
  echo "抓到 0 人，判断为登录态失效，中止（不跑 engage/回采）"
  notify "知乎每日任务" "知乎登录态疑似失效，今日点赞/回采已跳过，请先在浏览器登录 zhihu.com"
  exit 1
fi

# 2. 评分出报告
node scripts/liker-scan/score-likers.mjs || echo "score 失败（继续）"

# 3. 回赞（真实对外操作，上限 20 人）
node scripts/liker-scan/engage-likers.mjs --max 20 || echo "engage 失败（继续回采）"

# 4. 回采表现数据（官方 CLI，快照写 data/raw + 回写 db）
node scripts/tracker-snapshot.mjs || echo "回采失败"

# 5. 统一同步：导入新快照/互动数据并刷新总表与看板
node scripts/db/sync.mjs || echo "sync 失败"

echo "===== daily-engage end $(date '+%F %T') ====="
