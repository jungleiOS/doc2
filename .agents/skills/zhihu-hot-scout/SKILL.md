---
name: zhihu-hot-scout
description: 热榜速报：抓知乎全站热榜 + 数码话题热榜，领域速滤后只给「抢/弃」二元判断（不做 D×O×M×Q 打分），用户点头后交 zhihu-answer-drafter 走热点快车道起草。整个流程目标 ≤10 分钟。当用户说「看看热榜」「热榜有什么能答的」「今天热榜」「抢热点」时触发。
---

# 知乎热榜选题助手（zhihu-hot-scout）

从知乎热榜里筛出**值得抢答**的题。与常规选题（zhihu-question-scout）逻辑相反：那边吃长尾、挑前排空虚；这边吃 24-48h 爆发窗口、拼判断速度。**本 skill 不打分、不排序给 3 个，只对每条存活题给「抢（+建议立场方向）/ 弃（+理由）」的二元判断**，用户点头「抢」的题直接交 zhihu-answer-drafter 走热点快车道（其 §2.5 维度 7 已定义：压缩迭代轮次、配图底线 2-3 张，事实核查与立场仲裁不压缩）。

## 为什么独立成 skill

触发词、节奏、判定逻辑与常规 scout 完全不同：热榜题必然涌入大量回答，前排以小时计固化，D×O×M×Q 那套慢工细活等评完窗口就关了。硬合并只会两本手册互相污染。

## 工作流程

### 1. 浏览器通道检查（同 zhihu-question-scout §1）

用 **ego-browser**（taskSpace 名用 `zhihu-hot-scout`），先开 `https://www.zhihu.com/hot` 确认登录态。

### 2. 抓榜（2026-10-12 实测校准）

两个榜单，各抓前 30 条（30 名开外基本没有爆发红利）：

1. **全站热榜**：`https://www.zhihu.com/hot`
2. **数码话题热榜**：数码话题页的热榜区（`https://www.zhihu.com/topic/19550517/hot`，话题 ID 如失效先 navigate 话题页再找热榜入口；只作补充，全站榜为主）

**实测可用的提取脚本**（ego-browser 现版 API——`taskSpace()/task.page()/page.evaluate()`；旧版 `useOrCreateTaskSpace/openOrReuseTab/js()` 已失效，勿抄旧 skill 示例）：

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("zhihu-hot-scout");
const page = task.page("p1");
await page.goto("https://www.zhihu.com/hot");
await page.waitForTimeout(3500);
const data = await page.evaluate(() => {
  return [...document.querySelectorAll(".HotItem")].slice(0, 30).map((el, i) => {
    const a = el.querySelector("a[href]");
    const title = (el.querySelector(".HotItem-title")?.textContent || "").trim();
    const metrics = (el.querySelector(".HotItem-metrics")?.textContent || "").trim();
    const href = a ? a.getAttribute("href") : "";
    const m = href.match(/\/question\/(\d+)/);
    return { rank: i + 1, title, qid: m ? m[1] : null, metrics };
  });
});
console.log(JSON.stringify({spaceId: task.spaceId, data}));
EOF
```

注意：热榜条目不全是问题（可能是专栏/视频），`qid` 为 null 的丢弃；`metrics` 里的热度值保留原文（如「277 万热度」）供速报引用。问题页统计（关注/浏览/回答数/前 5 赞数）抓取脚本同 zhihu-question-scout §5.2 的 `body.innerText` 正则法，在同一轮 goto 里顺手完成。

### 3. 领域速滤（秒弃级）

对照选题画像（zhihu-question-scout §2 的同一套：苹果生态/数码配件/学生场景/AI 硬件，锚定作者人设「理工科视角、用实测数据拆营销话术」）硬匹配，不相关的秒弃，不犹豫。热榜 90% 与你无关，过滤后通常剩 0-5 条。**一条都不剩是正常结果**——如实报告「本轮热榜无可抢题」，不要硬凑。

### 4. 红利判断（存活题逐条做三件事）

1. **题龄**：问题创建时间 <48h = 红利期；>7 天的老题突然被顶上热榜**默认不再直接弃**（2026-10-12 实跑修正：老题「关机 vs 重启」2024 年创建、仅 18 条回答被顶到全站第 10，供给空虚的老题被热榜重新灌流是红利不是陷阱）——改为综合看：老题 + 回答数 <20 + 前排赞数低 = **最佳抢位**；老题 + 回答数已多 + 前排定型 = 才是真二手热点，弃。**题龄抓取有坑（实测）**：问题日志页 `/log` 用正则抓日期时，页面 body 里第一个日期是最近的编辑日志，创建时间是**最后一个日期**——抓全部日期取 last，别取 first（否则 2024 年的题会被报成今天创建）
2. **竞争涌入速度**：抓当前回答数，追加 JSONL 到 `analytics/hot-pool.jsonl`（格式同 scout §7.1：`{date,id,title,answers,views,rank}`）。同题已有历史快照时算回答数增速——数小时内翻倍 = 涌入汹涌，拼手速不拼质量，配图底线优先；缓增 = 还有位置。无快照的新题跳过此信号
3. **占领度检查**：默认排序前排是否已被万粉答主/官方号占据 + 前排立场是否已定型。已定型且无空白带 → 弃；有空白带或共识带薄弱环节 → 可抢，建议立场方向按 zhihu-answer-drafter §2.5 维度 2 的三问（共识带/空白带/最薄弱环节）快速判断，此处只给方向不给全文分析（全文分析是 drafter 决策卡的事）

### 5. 输出热榜速报

```markdown
## 热榜速报（扫了 x 条，领域存活 x 条）

### 候选1：[标题](URL)
- 链接：https://www.zhihu.com/question/xxxx（完整裸 URL，显式列出）
- 榜单位置 / 题龄 / 回答数 / 涌入速度：……
- 判定：**抢**——理由一句话 + 建议立场方向；或 **弃**——理由一句话
- 好物评估：顺带按 zhihu-haowu-evaluator 给三档结论（热榜题大多是观点型，多数结论会是「不插」）
```

然后问用户：对哪条点头？确认后调用 **zhihu-answer-drafter**（告知其走热点快车道），决策卡照常做但允许整体提速。

**每日「抢」上限 2 条**：热榜写作挤占常规长尾产能，且一天多篇热榜回答对账号像蹭热度营销号，消耗「实测数据拆营销话术」的人设。速报里第 3 条及以上即使判定「抢」也标注「今日额度已满，建议明日或放弃」。

### 6. 数据闭环

热榜题发布后 24h 复盘权重高于常规题（窗口短、反馈快）：回采走 zhihu-answer-tracker，回写 `outlines/选题历史.md` 复盘行（来源列写「热榜」），同时更新 `analytics/hot-pool.jsonl` 对应行的浏览/排名。攒约 10 条热榜复盘后，回测「题龄/涌入速度/占领度」三个判断的命中率，校准本 skill §4 的默认倾向（比如「老题上热榜是否默认弃」）。

## 禁忌

- 不替用户发布任何内容，只做筛选与判断。
- 禁止硬凑：存活 0 条就如实说 0 条；没有「抢」的题就报没有。热榜不是每天都有你的机会。
- 禁止对热榜题套用 zhihu-question-scout 的 D×O×M×Q 打分——那是长尾逻辑，热榜题等打完分窗口已关。
- 事实核查与立场仲裁不得因抢时效而压缩（与 drafter §2.5 维度 7 一致）；宁可晚发半天，不发会被打脸的热榜稿——热榜评论区流量大，翻车的传播也是平时的十倍。
- 不编造热榜数据；榜单抓不到就如实说明。
