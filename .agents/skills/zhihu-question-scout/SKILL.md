---
name: zhihu-question-scout
description: 用 Kimi WebBridge 抓取知乎「邀请回答」和「推荐问题」列表，结合本仓库已有文章的选题领域，每次为用户筛出 3 个最值得回答的问题，确认后直接起草回答初稿。当用户说「选题」「帮我选问题」「看看知乎邀请」「推荐问题」「今天答什么」「有什么可答的问题」时触发。
---

# 知乎选题助手（zhihu-question-scout）

从用户的知乎邀请回答 + 创作中心推荐问题中，每次选出 **3 个** 与已有文章领域最匹配的问题，确认后起草回答。

## 工作流程

### 1. WebBridge 健康检查（必做）

```bash
~/.kimi-webbridge/bin/kimi-webbridge status
```

要求 `running: true` 且 `extension_connected: true`，否则按 kimi-webbridge skill 的 `references/operations.md` 处理。后续所有请求用 session 名 `zhihu-scout`。

### 2. 建立用户选题画像

仓库文章按「归集目录」组织（如 `多口充电器选购指南/` 内含主文、衍生回答、子级 `drafts/`）。快速扫描以下位置提炼用户擅长领域、已有观点和已答主题：

- 根目录的 `*.md`
- 各文章归集目录（含其子级 `drafts/`）
- `drafts/`、`published/`（如有）

只读标题和各级 `#`/`##` 标题，不要全文通读。画像要点：核心领域（如充电/数码/AI 硬件）、已覆盖主题（避免重复）、可复用的实测案例。

### 3. 抓取问题列表

知乎创作中心「问题推荐」页有两个标签（已实测可直接抓取）：

- 邀请回答：`https://www.zhihu.com/creator/featured-question/invited`
- 推荐问题：`https://www.zhihu.com/creator/featured-question/recommend`

对每个页面：navigate → sleep 3~4 秒 → 用下面的 evaluate 脚本提取（已实测可用）：

```js
(()=>{const qs=[...document.querySelectorAll("a[href*=\"/question/\"]")].map(a=>({t:(a.innerText||"").trim().replace(/\n+/g," ").slice(0,80),h:a.getAttribute("href")})).filter(x=>x.t.length>5&&/\/question\/\d+$/.test(x.h||""));const seen=new Set();const out=[];for(const x of qs){if(!seen.has(x.h)){seen.add(x.h);out.push(x);}}return JSON.stringify(out)})()
```

注意：

- 通过 curl 调用 WebBridge 时，JS 需做 JSON 转义。
- 返回空数组时先 `snapshot` 确认是否登录墙（是则提示用户先在浏览器登录知乎）。
- 两个来源合并后按问题 ID（URL 中的数字）去重；邀请的问题优先级高于推荐。

### 4. 历史去重

读取 `outlines/选题历史.md`，提取所有问题 ID，从候选列表中剔除——**选过的和标注「已弃选」的都不再推荐**。文件不存在则视为无历史。

### 5. 评分筛选

对去重后的候选按以下维度打分（1-5），选总分最高的 3 个：

- **领域匹配**：是否落在已有文章领域里——权重最高
- **信息增量**：能否给出超越百科的干货或真实经验
- **复用度**：能否直接复用已有文章的观点/案例/数据
- **HKR 检验**：按根目录 AGENTS.md 的 Happy/Knowledge/Resonance 至少占两项

排除项：

- 与已发布文章/已有草稿主题完全重复的（除非有新角度）
- 用户没有一手经验的领域（医疗/法律/金融投资等，遵守根 AGENTS.md 边界）

### 6. 输出选题单

```markdown
## 本次选题（共 N 个候选，选出 3 个）

### 1. [问题标题](问题URL)
- 来源：邀请 / 推荐
- 匹配理由：……（必须引用具体的已有文章文件名）
- 建议切入角度：……（指明可复用哪篇文章的哪些观点）
- 注意：……（如有事实核查点或风险）
```

然后询问用户：要对哪些题目起草回答？

### 7. 起草回答（用户确认后）

用户确认题目后（或直接指定题目后），**直接起草，不重新选题、不再二次确认**。规则：

- **先读问题完整描述再动笔（必做）**：用 WebBridge 逐个 navigate 到问题 URL，sleep 3 秒后用下面的 evaluate 脚本提取标题 + 补充说明（问题描述里常有具体机型、使用场景、提问者的真实困惑，回答必须逐点回应，只看标题写稿等于瞎写）：

```js
(()=>{const t=(document.querySelector(".QuestionHeader-title")||{}).innerText||"";const d=(document.querySelector(".QuestionRichText")||document.querySelector("div.RichText.ztext")||{}).innerText||"";return JSON.stringify({t:t.trim(),d:d.trim().slice(0,2000)})})()
```

- 调用 `zhihu-viral-answer` skill 的流程和结构。
- 素材优先复用归集目录里的主文和已有回答，保持一致的口吻和「先说结论 + 实测案例 + 文尾引流」结构。
- **事实核查**：涉及具体设备型号、充电功率、协议规格时，先用 WebSearch 核实（官网规格页、充电头网实测优先），不要沿用未经核实的数字；用户提供的真实设备信息要融入回答。
- 初稿存到对应归集目录的 `drafts/`，命名 `zhihu-<主题>-v1.md`；**先读该目录的 AGENTS.md 并遵守其约定**（如引流主文的固定链接写法）。
- 用户明确排除的题目：不起草，把问题 ID 记入 `outlines/选题历史.md` 并在标题后标注「（已弃选，不再推荐）」。

### 8. 记录与收尾

把本次选出的问题追加到 `outlines/选题历史.md`：

```markdown
| 日期 | 问题ID | 标题 | 来源 |
|------|--------|------|------|
| 2026-08-18 | 1961371990993663235 | 华为手机+联想笔记本，求推荐一个能共用的100W充电器？ | 邀请 |
```

然后关闭浏览器会话：

```bash
curl -s -X POST http://127.0.0.1:10086/command -d '{"action":"close_session","args":{},"session":"zhihu-scout"}'
```

## 禁忌

- 不替用户实际提交/发布任何回答，只做选题和起草。
- 不编造问题数据；抓取失败就如实说明，不假装看到了列表。
- 选题理由必须引用具体的已有文章文件名，禁止空泛的「和你的领域匹配」。
- 起草不编造第一手体验；用户未提供的设备/经历不写进回答，涉及参数先核查再落笔。
- 禁止只看问题标题就起草；未读问题完整描述写出的稿子必须作废重写。
