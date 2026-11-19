# 选题追踪工具集（scripts/track/）

追踪一批「选题品味好」的知乎答主：浏览时发现值得学习的人，一键加入**追踪名单**；选题时查看他们最近在回答什么新问题，从里面挑题进自己的**选题池**。概念上分清两层：**答主只是信标，他回答过的题目才是要进选题池的东西**。

## 工作流

```
浏览知乎 → 点「＋追踪答主」把这位答主加入追踪名单        （Chrome 扩展 + 本地服务）
    → 选题前采集他们最近的回答           （collect.mjs，eg o-browser 复用登录态）
        → 看「他们在答什么」报告          （report.mjs）
```

## 组件

| 文件 | 作用 |
|------|------|
| `server.mjs` | 本地写回服务（`127.0.0.1:43121`），接收扩展写入，维护追踪名单 |
| `zhihu-track-extension/` | **Chrome 扩展（MV3，推荐）**：知乎回答/文章页作者名片旁注入「＋追踪答主」按钮，已追踪的显示「✓已追踪」 |
| `collect.mjs` | 逐个抓取追踪答主主页最新回答，与上次快照 diff，增量落盘 |
| `report.mjs` | 聚合最近 N 天采集结果，生成选题报告 |
| `run-scheduled.mjs` | 定时采集入口（launchd 每天 13:07 / 18:07 调用）：先探活 ego-browser 登录会话，活着才抓；有增量才生成报告并弹 macOS 通知，无增量/探活失败只记日志到 `data/raw/track-schedule.log` |
| `paths.mjs` | 目录约定（快照/原始数据/报告路径） |

## 数据去向

| 路径 | 内容 | 是否入 git |
|------|------|----------|
| `data/tracked-authors.jsonl` | 追踪名单（urlToken / 昵称 / 备注 / 标签 / 开始追踪时的回答链接 / 开始追踪日期） | ✅ 入 |
| `data/raw/track-snapshot/<urlToken>.json` | 每人最近一次抓到的回答快照（diff 基准） | ❌ gitignore |
| `data/raw/tracked-answers-YYYY-MM-DD.jsonl` | 本次新增的他人回答（增量） | ❌ gitignore |
| `analytics/track/report-YYYY-MM-DD.md` | 人读的选题报告 | ✅ 入 |

名单去重键是 `urlToken`，重复加入视为更新备注/标签（保留最早入池时间与最早来源链接）。

## 命令

```bash
# 1. 启动本地服务（扩展的前提，常驻）
node scripts/track/server.mjs

# 2. 安装 Chrome 扩展（一次性，30 秒）
#    chrome://extensions/ → 右上角「开发者模式」打开（ego 里默认已开）
#    → 左上角「加载已解压的扩展程序」→ 选择本目录下的 zhihu-track-extension/
#    以后改代码直接在文件上改，回 chrome://extensions 点该扩展的圆形刷新箭头即可
#    装好后到知乎回答页，作者名片旁应出现「＋追踪答主」按钮

# 3. 选题前采集（默认每人最近 5 条）
node scripts/track/collect.mjs
node scripts/track/collect.mjs --limit 50

# 4. 看报告
node scripts/track/report.mjs          # 默认近 7 天
node scripts/track/report.mjs --days 14
```

## 服务接口（server.mjs）

| 接口 | 说明 |
|------|------|
| `POST /add` | body `{urlToken, name?, sourceAnswerUrl?, note?, tags?}`；只 `urlToken` 必填，新增或更新，返回 `{ok, updated}`。**更新只用非空新值覆盖**，空字段不会清掉已有昵称/备注 |
| `POST /remove` | body `{urlToken}`，取消追踪，返回 `{ok, removed}` |
| `POST /has` | body `["token1","token2",...]`，返回已追踪的 token 集合（扩展批量打标用） |
| `GET /has?token=xxx` | 单查是否已追踪 |
| `GET /list` | 返回完整追踪名单 |

## 服务管理（2026-11-08 起，开机自启）

`server.mjs` 和定时采集都已托管，重启电脑不用手动管：

| 组件 | 托管方式 | 频率 |
|------|----------|------|
| 写回服务 `server.mjs` | launchd：`~/Library/LaunchAgents/com.jiangjun.zhihu-track-server.plist`（开机自启 + 崩溃自动拉起） | 常驻 |
| 定时采集 `run-scheduled.mjs` | launchd：`~/Library/LaunchAgents/com.jiangjun.zhihu-track-collect.plist`（13:07 / 18:07 触发） | 每天 2 次 |

```bash
# 查服务状态 / 手动重启 / 停掉自启 / 看日志
launchctl print gui/$(id -u)/com.jiangjun.zhihu-track-server | grep state
launchctl kickstart gui/$(id -u)/com.jiangjun.zhihu-track-server
launchctl bootout gui/$(id -u)/com.jiangjun.zhihu-track-server   # 想恢复：launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jiangjun.zhihu-track-server.plist
tail -f ~/Library/Logs/zhihu-track/server.log   # 服务日志
tail -f data/raw/track-schedule.log             # 定时采集日志（脚本内记录）
cat ~/Library/Logs/zhihu-track/collect.log      # launchd 视角的采集输出
```

注意：
- plist 里写死了 node 绝对路径（nvm 版），升 node 大版本后要改 plist 里的路径。
- **不要用 crontab 托管**（2026-11-09 踩过坑）：macOS 的 cron 无 Full Disk Access，脚本会被「Operation not permitted」静默拦死，且邮件通知到 `/var/mail` 没人看。launchd 是正道。
- **launchd 的 StandardOutPath/StandardErrorPath 不能指向 `~/Documents` 下的文件**（2026-11-13 踩过坑）：launchd 打开日志文件被 TCC 拦（xpcproxy exit 78 EX_CONFIG），任务永远起不来。日志一律写 `~/Library/Logs/zhihu-track/`；脚本内部自己写 `data/raw/` 不受限（node 进程有 Documents 权限）。plist 改过之后必须 `bootout` + `bootstrap` 重载才会生效。

## 注意事项

- 采集数据已进入选题工作流：`zhihu-question-scout` 的「追踪答主选题池」步骤每轮选题先读 `analytics/track/report-*.md`，追踪答主的新答题目作为候选来源参与打分。
- **已实测（2026-11-08）**：server 接口（/add、/has、/list）、collect 抓取（选择器按真实个人页校准：`.List-item` + `a[href*="/question/"]`，赞同数取卡片 `data-za-extra-module` 里的 `upvote_num`）、report 出报告，全链路通；launchd 自启 + KeepAlive 拉起已实测（kill 进程后 3 秒内被拉回）；定时脚本手动跑通（无增量不打扰）。Chrome 扩展（zhihu-track-extension/）代码自测通过（语法/清单校验），注入效果待安装后实测。
- 采集走 ego-browser 的已登录会话（模式与 `scripts/liker-scan/` 相同），每人之间随机 sleep 2–4 秒防反爬；单页最多滚 15 屏。
- 列表页不渲染回答发布时间，`createdTime` 大多为 `null`；好在列表按时间倒序，新鲜度不受影响。
- 知乎前端改版可能导致按钮不出现或采集选择器失效：按钮问题查 `zhihu-track-extension/content.js` 里的作者名片选择器；采集为空时查 `collect.mjs` 里的列表项选择器。
- 采集结果可先 SQL/文本查看，是否并入 `data/zhihu.db` 由 `sync` 管线决定（当前为独立数据流，不自动入库）。
