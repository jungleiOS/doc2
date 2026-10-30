# 选题公共流程（scout-common）

本文件是 `zhihu-question-scout`（普通/流量选题）与 `zhihu-haowu-scout`（带货选题）共用的流程文档。两个 skill 的 SKILL.md 中不再重复以下内容，差异部分（选题模型、硬否决、输出模板）以各自 SKILL.md 为准。

## 1. 浏览器通道检查（必做）

用 **ego-browser**（用户真实浏览器、登录态在）。⚠️ API 已换代（2026-10-12 实测）：现版用 `taskSpace("zhihu-scout")` + `task.page("p1")` + `page.goto()/page.evaluate()`，旧版 `useOrCreateTaskSpace/openOrReuseTab/js()` 已失效：

```bash
ego-browser nodejs <<'EOF'
const ts = await useOrCreateTaskSpace('zhihu-scout');   // 按名字幂等获取，不用记 id
const tab = await openOrReuseTab('https://www.zhihu.com/creator/featured-question/invited', {wait:true});
await new Promise(r=>setTimeout(r,3000));
const out = await js(`document.title`);
console.log(out);
EOF
```

注意：ESM 环境（`import fs from 'fs'` 可用，不能 require）；工作目录不是仓库根目录，读写文件用绝对路径；`js()` 里的模板字符串在 heredoc 中会被外层再解析一层，避免在 js 代码字符串里嵌套 `\n` 字面量。用户接管过浏览器后命令会报 hard stop，等用户说继续后 `claimTaskSpace(id)` 恢复。

## 2. 建立用户选题画像（2026-10-24 起走缓存，不每轮重扫）

**先读缓存文件 `analytics/选题画像.md`（仓库根，相对路径即可）**：存在且满足以下任一条件则直接复用，跳过本节的目录重扫——① 7 天内更新过；② 本轮选题前有新增话题归集目录（粗筛时顺带比对根目录话题文件夹数与缓存里登记的数量，不一致才重建）。缓存不存在、过期且目录有变化、或用户明确要求刷新时才按下文重建并覆盖写回该文件（文件头部注明重建日期和话题目录数）。

重建时才执行的目录扫描（缓存命中时完全跳过）：

- 根目录的 `*.md`
- 各话题归集目录（含 `_主稿/` 和各问题文件夹）
- `outlines/`、`research/`

只读标题和各级 `#`/`##` 标题，不要全文通读。画像要点：核心领域（如充电/数码/AI 硬件）、已覆盖主题（避免重复）、可复用的实测案例。**写回缓存时按此结构落盘：重建日期、话题目录清单（名称+数量）、核心领域、已覆盖主题、可复用实测案例清单。**

另需加载**粉丝画像**（2026-10-22 更新：以官方实时数据为准）：优先用知乎官方 CLI 读实时画像——`"$HOME/Library/Application Support/zhihu-cli/current/zhihu-cli" me stats --type answer`，取 `Data.Audience` 的 `Age`/`Gender`/`Location`/`Source`（年龄/性别/地域/流量来源分布），这是当前自然日统计口径的活数据。`analytics/` 下的历史数据报告只作趋势对照，不再作为画像准绳（实测差异案例：历史报告称 25 岁以下 60.5%，`me stats` 实时口径为 25-40 岁 79%——画像结论以 `me stats` 为准）。选题角度优先锚定粉丝已有兴趣点；与粉丝画像错配的选题，在「建议切入角度」里如实说明风险，由用户定夺。

## 3. 抓取问题列表

知乎问题来源共五个，**按优先级从高到低**：

0. **官方问题发现（2026-10-22 新增，每轮选题第 0 步）**：知乎官方 CLI `question recommend`——画像模式 1-2 次（`"$CLI" question recommend --count 20`），主题模式按领域关键词 2-3 次（如 `--query '充电器'`、`--query '充电宝'`、`--query 'iPad'`）。实测画像模式推荐质量高（推题直接命中苹果生态/数码画像），正好替代原「第四来源」里靠浏览器按时间排序搜的打捞动作。返回只有标题+链接，无统计数据，全部进阶段 B 精评。额度 `question_discovery` 100 次/自然日（与 `question answers` 共用），一轮选题用 5 次以内，充裕。CLI 路径：`CLI="$HOME/Library/Application Support/zhihu-cli/current/zhihu-cli"`。
1. **关注的问题（第一浏览器来源，2026-10-11 起）**：`https://www.zhihu.com/people/<自己的用户ID>/following/questions`（如 `/people/jungle-26-32/following/questions`；注意旧入口 `/follow/questions` 已 404，个人主页关注订阅区也没有直达链接，直接拼这个 URL）——用户自己点过关注的问题，意图纯度最高，优先从这里选题。**列表页每个问题项自带关注时间和回答数/关注数，无需滚动即可读到**；列表分页加载（底部有页码），按关注时间倒序，翻到出现 3 天前的条目即可停。**只取最近 3 天关注的问题**（关注量不大，更早的不用抓）。提取用 `a[href*="/question/"]` 选择器，过滤掉「问题圆桌/话题」等非问题链接，只看 `href` 以数字结尾的。抓不到就先 `snapshot` 看登录墙。
2. **邀请回答**：`https://www.zhihu.com/creator/featured-question/invited`
3. **推荐问题**：`https://www.zhihu.com/creator/featured-question/recommend`
4. **主动搜新问题**（第四来源，见下方说明）：仅前三个来源粗筛后存活 <5 个时启用。

对邀请/推荐页面：navigate → sleep 3~4 秒 → **先滚动加载到 40 条**再提取。

滚动加载：列表是无限滚动加载，用下面的脚本滚动到目标条数或到底（滚动由页面自身触发，不额外刷新页面，风控成本与手刷一致）：

```js
(async()=>{const q=()=>[...document.querySelectorAll("a[href*=\"/question/\"]")].filter(a=>/\/question\/\d+$/.test(a.getAttribute("href")||"")).length;let last=0;for(let i=0;i<10;i++){window.scrollTo(0,document.body.scrollHeight);await new Promise(r=>setTimeout(r,1500));const n=q();if(n>=40||n===last)break;last=n;}return q()})()
```

然后用下面的 evaluate 脚本提取（已实测可用）：

```js
(()=>{const qs=[...document.querySelectorAll("a[href*=\"/question/\"]")].map(a=>({t:(a.innerText||"").trim().replace(/\n+/g," ").slice(0,80),h:a.getAttribute("href")})).filter(x=>x.t.length>5&&/\/question\/\d+$/.test(x.h||""));const seen=new Set();const out=[];for(const x of qs){if(!seen.has(x.h)){seen.add(x.h);out.push(x);}}return JSON.stringify(out)})()
```

注意：

- 返回空数组时先 `snapshot` 确认是否登录墙（是则提示用户先在浏览器登录知乎）。
- 多来源合并后按问题 ID（URL 中的数字）去重；来源优先级：关注的问题 > 邀请 > 推荐 > 官方推荐（来源 0 是补充打捞通道，同题出现时按最高优先级记来源）。
- **主动搜新问题（第四来源，2026-08-31 起）**：邀请/推荐列表里大多是衰退期老问题。前三个来源粗筛后存活 <5 个时，用知乎搜索领域关键词（如「充电宝」「充电器」）按时间排序，或看「数码」话题的实时流，打捞**诞生期/爆发期问题**——提出 ≤7 天、已有 3-8 个回答、关注者 >20 且在增长。新问题在 24h 内有热榜/推荐爆发窗口，是冷启动红利区；等问题进入死寂期再答，等于在废墟里捡流量。

## 4. 历史去重 + 未答回捞（2026-10-26 重构）

读取 `outlines/选题历史.md`，提取所有问题 ID 及其状态标注，分三类处理：

- **已弃选 / 已废弃 / 落选 / 近重复落选**（标题含这些标注）：剔除，不再推荐。
- **已答**（该问题下方已有「复盘」行，或标题标注「已答」）：剔除。
- **已选未答**（2026-10-26 新增状态：选题单入选过、用户没有弃选、但一直没起草/发布——标题标注「（已选未答）」）：**不剔除，每轮选题开头先回捞**——把历史表里所有「已选未答」题列出来，重新抓一次数据（关注/浏览/回答数/T/活性），更新快照，放在本轮选题单最前面的「未答回捞」区，让用户逐题裁决「清库存起草 / 弃选」。弃选的当场改标「已弃选，不再推荐」；继续搁置的保持「已选未答」下轮再捞。

**禁止不做回捞直接跑新选题**——前一天选了 7 题只答 2 题，剩下 5 题必须先在回捞区出现，由用户决定清不清库存，不能让它们被去重规则静默雪藏（2026-10-26 前就是没有状态语义，选过未答的题被一刀切剔除，用户发现库存丢失后重构本规则）。

文件不存在则视为无历史。

注意（2026-08-28 起）：去重只在**问题 ID 层面**做。**主题级近重复不再剔除**——撞已答主题或内容部分重叠的题仍可进入精评和最终选题单，但必须按各自 SKILL.md 的重复主题注明机制规则注明。

## 7.1 关注问题池增速快照（2026-10-12 起，每次选题必做）

关注的问题列表（第一来源）每次选题都会重抓，把**每个扫过的问题**（不论选没选）追加一行 JSONL 到 `analytics/followed-pool.jsonl`（工作目录用绝对路径，文件不存在则创建）：

```bash
node - <<'EOF'
import fs from 'fs';
const line = {date:'YYYY-MM-DD', id:'问题ID', title:'标题', followers:0, views:0, answers:0, type:'普通'};
fs.appendFileSync('<仓库根>/analytics/followed-pool.jsonl', JSON.stringify(line)+'\n');
EOF
```

`type` 字段区分来源 skill：`'普通'`（zhihu-question-scout）或 `'带货'`（zhihu-haowu-scout）。追加式 O(1)，不读不重写。查询某题增速（流式读全文，几百行毫秒级）：

```bash
node -e "const fs=require('fs');const rows=fs.readFileSync('<仓库根>/analytics/followed-pool.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.id==='<问题ID>');if(rows.length<2){console.log('快照不足');process.exit(0)}const a=rows[0],b=rows[rows.length-1];const days=(new Date(b.date)-new Date(a.date))/864e5;console.log('快照',rows.length,'次，',days.toFixed(0),'天，日浏览增量',((b.views-a.views)/days).toFixed(0),'，日关注增量',((b.followers-a.followers)/days).toFixed(1))"
```

攒够 4 周数据后，把「日浏览增量 >500 → D 直接 ≥4」从预留接口转为正式规则，并在活性判定中加入增速信号（增速 >0 的静默常青题放宽 D 封顶）。到时先用已有数据回测一遍阈值再转正。
