---
name: zhihu-comment-replier
description: 用 ego-browser 批处理知乎上别人对「我」的回复（回答/文章/想法下的评论）：抓取当天收到的回复 → 定位来源内容与父评论 → 按回复策略筛选（提问必回、有理质疑要回、纯夸和杠精跳过）→ 用作者口吻生成回复草稿 → 逐条经用户审核后代为发布。当用户说「回复评论」「看看谁回复了我」「评论回一下」「批处理回复」「清评论」时触发。
---

# 知乎评论自动回复（zhihu-comment-replier）

定位：评论区运营工具。一次批处理 **10 条**，目标是把该回的评论回掉，把杠精和广告过滤掉。**所有回复必须经用户逐条审核后才发送，禁止自动直发。**

## 0. 状态文件（防重复处理）

批次日志固定在仓库根目录 `zhihu-auto-reply/`：

- `processed.log`：每行一条已处理评论的 URL（发/跳都记），抓取后先过滤掉这里的 URL，避免重跑重复打扰同一人；
- `batch-<YYYY-MM-DD>.md`：当天批次记录（评论摘要、判定、用户决定、最终回复内容、发送结果）。

目录不存在则创建。

## 1. 抓取今天的回复（ego-browser）

按 ego-browser Skill 的规范操作。task space 名 `zhihu-comment-replier`：

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("zhihu-comment-replier");
const page = task.page("p1");
await page.goto("https://www.zhihu.com/notifications");
await page.waitForLoadState();
console.log(await page.snapshot());
EOF
```

- 遇到登录墙：停下，让用户先在浏览器登录知乎，不要尝试绕过；
- 定位「回复我的」Tab（URL 形态通常为 `https://www.zhihu.com/notifications/reply`，以页面实际为准），用 `page.evaluate()` 批量提取，每条产出：

```json
{"commentUrl":"…","commentText":"…","commentTime":"…","commenter":"…","sourceType":"回答|文章|想法","sourceUrl":"…","sourceTitle":"…","parentExcerpt":"…"}
```

- `sourceType`/`sourceUrl` 从通知项里的跳转链接判断（`/answer/`、`/p/`、`/pin/`）；`parentExcerpt` 是对方回复的那条评论（可能是我的评论或别人的评论）的摘要；
- 一次抓 10 条（优先今天，不足则按时间往前补）；翻页用页面按钮，不猜接口；
- 首次使用的提取选择器必须实测校准：拿 1 条提取结果与页面肉眼核对，错了就改选择器重跑，不编造字段。

## 2. 读取上下文并判定

对每条候选，**先读上下文再判定**：

1. 打开 `sourceUrl`，读我自己的回答/文章/想法原文（正文 + 相关段落）；
2. 展开评论线程找到 `parentExcerpt` 所在对话，确认对方在说什么、是不是回复我；
3. 按回复策略判定：

| 类型 | 判定 | 动作 |
|------|------|------|
| 提问、求推荐、求链接 | **必回** | 生成回复 |
| 有理有据的质疑/反对/纠错 | **要回** | 生成回复；纠错属实就认，回复里致谢 |
| 补充信息、分享经历 | 要回 | 生成简短回应 |
| 纯夸、纯点赞、无信息量 | 跳过 | 记「跳过：纯夸」 |
| 广告引流、人身攻击、无理抬杠 | 跳过 | 记「跳过：垃圾评论」 |

拿不准的一律生成草稿交给用户决定，不替用户放弃。

## 3. 生成回复草稿

语气规范见 [references/reply-style.md](references/reply-style.md)（知乎体、作者口吻）。要点：

- 2-5 句，口语化，像作者本人在回，不像客服；
- 直接回应对方的问题或观点，不复述自己的原文；
- 求推荐类：给 1-2 个具体推荐 + 一句理由，不甩「看原文」；
- 纠错类：属实就大方承认并修正，不硬撑；
- 写完自查一遍 AI 味（套话、排比、「首先其次」、表情堆砌），不合格重写。

## 4. 逐条审核

两种模式，由用户选：

- **控制台模式**：一次最多把 10 条的决定攒成 1-2 轮 AskUserQuestion，每条展示 `[n/10] 来源《标题》| 对方：评论摘要 | 判定：必回 | 草稿：…`，选项：发送 / 修改（用户给意见后改一版再问）/ 跳过；
- **草稿文件模式（2026-10-03 实测用户偏好）**：先把全部文案写入 `zhihu-auto-reply/batch-<YYYY-MM-DD>.md`（逐条标 ⏳ 待发送 / ⏭️ 跳过，**每条必须附原文回答链接**），用户自己审完文件后再下一轮执行发送；此模式下 `processed.log` 在真正发送后才追加。

## 4.1 实测校准记录（发布评论的坑全部已由 `reply.js` 固化，**不要重测、不要改用手动流程**）

**通知抓取**（2026-10-03）：

- 入口 `https://www.zhihu.com/notifications`，无独立「回复我的」URL（`/notifications/reply` 空白页）；筛选：点「全部通知」开下拉 → 点「评论与回复」。按钮文本带零宽字符（`全部通知\u200b`），`text=` 定位器会失配，**用 page.evaluate 按去零宽后的 textContent 精确匹配再 `.click()`**；
- 提取：`document.querySelectorAll("article.NotificationList-Item")`；字段：`.NotificationList-Item-header a`（评论者）、`.NotificationList-Item-verb`（动作）、`time[datetime]`、`.NotificationList-Item-content a`（来源标题，**纯按钮无 href 不跳转**）、`.NotificationList-Item-extendText`（评论摘要）；
- 通知项里**没有评论 URL**：去重键用 `来源标题 + 评论者 + datetime`；跳过 `该内容被删除` 的条目；
- 来源回答 URL 按标题关键词去 `outlines/选题历史.md` / 话题 `问题对应表.md` 查问题 ID 拿 `/question/<id>`，开问题页取回答链接并用作者名（Apple 研究生）核实是自己；已验证映射：死机=2085637806781642585/2086227761451090442，插卡平板=2833008199/2088261099854602944，自动断电=23691052/2087665282592551534，Mac耐用=2053805488924578044/2080787251789815954，充电头=1883710952018526535/2088046888767447311。

**历史坑（教训已被 reply.js 吸收）**：评论区是 Draft.js，`keyboard.paste` 静默失败且积压底层 model 会拼出 N 遍重复文本；「祖先含对方文本」的校验太松会回复错人；删自己评论用 `page.fetch("/api/v4/comments/<id>", {method:"DELETE"})`（204 成功），删前必须用 `child_comments`/`root_comments` 两个接口核实 id 归属。

**其他场景**：

- 文章评论区发送按钮文本是「发布」不是「发送」（2026-10-11）；
- 编辑已发布回答（编辑器是 Lexical）：直接改 DOM、`execCommand("insertText")`、JS 构造 Selection 粘贴全部无效或错位，且会静默保存截断。唯一可靠姿势：`scrollIntoView` 后等 1 秒重新取坐标 → `mouse.click` 放光标 → `keyboard.paste({text})` 插入 → 提交后 `reload` 验证线上文本，截断立即修复重提。

## 5. 代为发布

**首选：用配套脚本 `reply.js`，已固化上述全部校验，无需每次重新推理**（2026-10-14 KenZN 批验证通过）：

```bash
# 参数写入 .reply-args.json（仓库根目录）：["<回答URL>", "<评论匹配关键词>", "<回复文本>"]
cat .agents/skills/zhihu-comment-replier/reply.js | ego-browser nodejs
```

注意：ego nodejs 不支持 `脚本文件 + 位置参数` 的调用方式（报 "at most one source argument"），且脚本内相对路径不落在仓库根目录——必须用 stdin 喂脚本 + 根目录参数文件（脚本已内置绝对路径回退，参数文件用后即删）。

脚本按评论关键词定位 `div[data-id]` 评论块，全部操作限定在块内，任何校验失败立即 abort。`SPACE_ID` 默认 32（zhihu-comment-replier space），可用环境变量 `EGO_SPACE_ID` 覆盖。

手动流程（脚本不可用时的兜底）：

1. 锁定对方评论块（`div[data-id]`），点块内「回复」→ 等输入框出现在该块内；
2. `keyboard.insertText({text: 最终回复})` 填入（**不能用 paste**，Draft.js 会静默积压）；写入后读 `textContent` 校验单份完整；
3. 点**块内**「发布」→ 用 `GET /api/v4/comments/<对方评论id>/child_comments` 复核回复在子级；
4. 成功后在批次日志补记「已发送 + 回复内容」，把评论 URL 追加进 `processed.log`；
5. 发送失败（风控提示、按钮不可用）如实记录并跳过本条，不反复重试；连续 2 条失败则停止整个批次并告知用户。

发布节奏：每条之间停顿 5-10 秒，不做全速连发。

## 6. 收尾

- 批次日志末尾汇总：10 条中 发 x / 改后发 x / 跳 x；
- 已发回复的文案值得沉淀：把质量好的回复套路（如纠错回应、求推荐回应模板）回写进 `references/reply-style.md` 的「已验证模板」一节；
- `task.finish({ keep: [] })` 结束浏览器任务。

## 禁忌

- **绝不未经审核直接发送**；审核时默认展示完整草稿，不概括；
- 不回复、不点赞、不关注任何未在批次内出现的账号和内容；
- 不编造对方没说过的话，判定依据必须来自实际抓到的文本；
- 抓不到的字段标「缺失」，不用想象补全；
- 涉及医疗、法律、投资建议的提问，草稿里加免责声明或建议咨询专业人士，并提醒用户注意。
