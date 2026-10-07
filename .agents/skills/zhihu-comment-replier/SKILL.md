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

## 4.1 实测校准记录（2026-10-03，可用脚本不要重测）

- 入口：`https://www.zhihu.com/notifications`，无独立「回复我的」URL（`/notifications/reply`、`/comment` 均空白页）；
- 筛选：点「全部通知」按钮开下拉 → 点「评论与回复」。注意按钮文本带零宽字符（`全部通知\u200b`），`text=`/`role=` 定位器会失配，**用 page.evaluate 里按去零宽后的 textContent 精确匹配再 `.click()`**；
- 提取：`document.querySelectorAll("article.NotificationList-Item")`，字段选择器 `.NotificationList-Item-header a`（评论者）、`.NotificationList-Item-verb`（动作，如「评论了你的回答」）、`time[datetime]`、`..Item-content a`（来源标题，纯按钮无 href）、`.NotificationList-Item-extendText`（评论摘要）；
- 通知项里**没有评论 URL**：去重键用 `来源标题 + 评论者 + datetime`；
- **来源回答 URL 的获取**（通知里的来源标题是纯按钮、点击经常不跳转，别硬点）：按标题关键词去 `outlines/选题历史.md` / 话题 `问题对应表.md` 查问题 ID 拿 `https://www.zhihu.com/question/<id>`，开问题页取第一个回答的 `/answer/<id>` 链接，再用作者名（Apple 研究生）核实是不是自己的回答；已验证的映射：死机=2085637806781642585/2086227761451090442，插卡平板=2833008199/2088261099854602944，自动断电=23691052/2087665282592551534，Mac耐用=2053805488924578044/2080787251789815954，充电头=1883710952018526535/2088046888767447311；
- 跳过 `该内容被删除` 的条目。
- **编辑已发布回答（2026-10-03 实测血泪）**：知乎编辑器是 Lexical 类模型驱动——直接改 DOM、`execCommand("insertText")`、JS 构造的 Selection 粘贴全部无效或插入错位，且会静默保存失败/截断。**唯一可靠姿势**：`scrollIntoView` 后等 1 秒重新取坐标（滚动动画会让第一次坐标失效）→ `mouse.click` 放置光标 → `keyboard.paste({text})` 在光标处插入 → 提交后必须 `reload` 验证线上文本，发现截断立即修复再提交一次。

## 5. 代为发布

用户确认后，回到评论页：

1. 定位该评论的「回复」按钮 → 点击 → 等输入框出现；
2. `keyboard.paste({text: 最终回复})` 填入（macOS 富文本编辑器推荐 paste，不用 type）；
3. 点击发送 → `waitForFunction` 等评论出现在线程里 → snapshot 或 evaluate 确认发布成功；
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
