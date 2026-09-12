---
name: zhihu-answer-drafter
description: 起草知乎回答初稿。通常由 zhihu-question-scout 选题确认后调用，也可在用户直接指定问题时独立触发。流程：读问题完整描述 → 按 zhihu-viral-answer 结构成稿 → 事实核查 → 配图（≥3 张真实图）→ 去 AI 味 → GEO 审查 → 存档登记。当用户说「起草回答」「写这个题」「按选题单起草」「把这个问题写成回答」时触发。
---

# 知乎回答起草助手（zhihu-answer-drafter）

把确认要答的知乎问题写成回答初稿。选题侧流程（怎么选题、打分、好物适配评估）在 **zhihu-question-scout** skill；本 skill 只管「题定了之后怎么写」。

## 工作流程

### 1. 浏览器通道检查（必做）

读问题描述和填编辑器都要操作用户真实浏览器。优先用 **ego-browser**：

```bash
ego-browser nodejs <<'EOF'
const ts = await useOrCreateTaskSpace('zhihu-draft');   // 按名字幂等获取，不用记 id
const tab = await openOrReuseTab('https://www.zhihu.com/', {wait:true});
await new Promise(r=>setTimeout(r,3000));
const out = await js(`document.title`);
console.log(out);
EOF
```

注意：ESM 环境（`import fs from 'fs'` 可用，不能 require）；工作目录不是仓库根目录，读写文件用绝对路径；`js()` 里的模板字符串在 heredoc 中会被外层再解析一层，避免在 js 代码字符串里嵌套 `\n` 字面量。用户接管过浏览器后命令会报 hard stop，等用户说继续后 `claimTaskSpace(id)` 恢复。

备用通道 **WebBridge**（浏览器无窗口时会报 `No current window`，此时直接换 ego-browser）：`~/.kimi-webbridge/bin/kimi-webbridge status`，要求 `running: true` 且 `extension_connected: true`，否则按 kimi-webbridge skill 的 `references/operations.md` 处理；session 名 `zhihu-draft`。

### 2. 先读问题完整描述再动笔（必做）

用户确认题目后（或直接指定题目后），**直接起草，不重新选题、不再二次确认**。先逐个 navigate 到问题 URL，sleep 3 秒后用下面的 evaluate 脚本提取标题 + 补充说明（问题描述里常有具体机型、使用场景、提问者的真实困惑，回答必须逐点回应，只看标题写稿等于瞎写）：

```js
(()=>{const t=(document.querySelector(".QuestionHeader-title")||{}).innerText||"";const d=(document.querySelector(".QuestionRichText")||document.querySelector("div.RichText.ztext")||{}).innerText||"";return JSON.stringify({t:t.trim(),d:d.trim().slice(0,2000)})})()
```

### 3. 成稿规则

- 调用 `zhihu-viral-answer` skill 的流程和结构。
- **一次只打磨一篇（迭代改稿流）**：用户确认题目后先起草这一篇，用户提改写意见 → 就地改 → 用户认可并发布后，才讨论下一篇。不一次批量出多篇。
- 素材优先复用归集目录里的主文和已有回答，保持一致的口吻和「文尾引流」固定写法，但**篇章结构必须逐篇差异化**（2026-08-31 复盘：8 天 12 篇统一「先说结论 + 实测案例 + 引流」骨架，疑似被算法判批量生产遭降权）——开头钩子、展开顺序、详略分布每篇换一种组织方式，不允许多篇套同一模板。
- **事实核查**：涉及具体设备型号、充电功率、协议规格时，先用 WebSearch 核实（官网规格页、充电头网及小白测评/科技美学/钟文泽/极客湾等大科技媒体实测优先），不要沿用未经核实的数字；用户提供的真实设备信息要融入回答。**正文引用实测数据时，给信源挂上原文链接**（如充电头网评测页）。**表述范围不得超过核实范围**——只核实到 X90 Pro 的代工厂信息，稿子里就写「X90 Pro 那颗」，不要外推成全系列（2026-08-21 实战教训）。

### 4. 配图工作流（强制：每篇 ≥3 张配图；用户无实拍条件，不要向用户索图）

**每篇草稿必须配不少于 3 张图，主体为真实图片（媒体实拍/测评图、官方图），每张都必须与所在段落内容直接相关。AI 生成图仅限两类破例：流程图/决策图/思维导图等示意类图；以及内含媒体实拍/测评图的合成图（如案例拼图）。除此之外的 AI 生成图严禁充当配图**。

起草时先想清楚需要哪些图（产品外观、铭牌、接口、实测数据、对比表格、示意图等），然后**从可信大科技媒体的图文评测里检索实拍/测评图并引用其数据**。

- **可信信源池**：充电头网（充电/功率类首选）、小白测评、科技美学、钟文泽、极客湾（Geekerwan）。这些媒体的实拍图和实测数据都可引用——正文挂原文链接，图片挂图源注（如「图源：小白测评」）。
- **检索路径**：WebSearch 搜「机型/产品名 + 评测 + 媒体名」锁定图文评测页 → FetchURL 拿原文、用 `curl` 抓 HTML 按正文段落定位目标图的 `src`；
- 下载时带 `Referer: <信源域名>` 头（static.chongdiantou.com 有 Referer 防盗链，裸 curl 会 403），存到归集目录 `cover-assets/raw/<事件名>/`；
- **必须 ReadMediaFile 回看校验图片内容**——段落与图片的对应关系不一定符合直觉（实测踩过坑：按段落顺序推定的「铭牌照」实为线材照），内容不符就换相邻图片重新校验；
- 插入草稿用相对路径 + 图源注（知乎编辑器不支持外链图，填编辑器时由作答辅助协议把本地图片通过知乎「导入图片」插进去，见 [references/publish-assist.md](references/publish-assist.md)）。

**破例类图的制作与缺口补足**：示意类图（流程图/决策图/思维导图）用归集目录既有的「HTML 渲染 → Puppeteer 截图」工作流制作；含媒体实拍的合成图在 `cover-assets/` 里拼版后截图。两类图产出后同样**必须 ReadMediaFile 回看校验**。媒体检索后真实图不足 3 张时，用破例类图补足到 3 张再交付，不向用户索要实拍。

### 5. 发布频率红线（2026-08-31 起）

带货回答同一自然日最多发 1 篇、每周 ≤3 篇；与上一篇带货回答间隔 <24h 时主动提醒用户缓发（8 天 12 篇的节奏已疑似触发营销号检测）。非带货干货回答不受此限，可作为带货回答之间的节奏缓冲，也是重建账号垂直权重的手段。

### 6. 去 AI 味（应对平台 AI 检测）

初稿完成后，用 `khazix-writer` skill 的风格内核做一遍「活人感」改写——口语化转场替代小标题和 bullet、长短句断裂（一句话独立成段）、禁用冒号/破折号/双引号、疑问句做节奏刹车。保留知乎侧骨架：信息密度、关键句加粗、引流固定写法、无谢邀。注意只借风格内核，**不套公众号固定尾部**，固定引流链接的标题一字不动。

### 7. GEO/SEO 审查（去 AI 味之后）

调用 `zhihu-geo-optimizer` skill 做一遍机器可读性审查——关键词布局、开头结论前置、信源入句、实体全称、结尾可引用结论句。只做增量改写；若与活人感冲突，活人感优先（仲裁规则见该 skill）。

### 8. 存档与登记

初稿存到对应归集目录的 `drafts/`，命名 `zhihu-<主题>-v1.md`；**先读该目录的 AGENTS.md 并遵守其约定**（如引流主文的固定链接写法、排版约定）。起草同时在 `drafts/问题对应表.md` 追加一行（日期/草稿文件/问题链接/描述摘要/状态）。

### 9. 作答辅助协议

「判 AI 创作应对协议」和「用 ego-browser 把草稿填进知乎编辑器（含图片导入）」两节在 [references/publish-assist.md](references/publish-assist.md)，起草、改稿、填编辑器时必读。

### 10. 收尾

全部草稿交付后关闭浏览器会话，按本次实际使用的通道二选一：

- **ego-browser（主力）**：`completeTaskSpace('zhihu-draft', { keep: false })`，必须放在独立最后一个 heredoc 里执行，且只在前序输出确认任务真正完成后才调用（细节见 ego-browser skill）。
- **WebBridge（备用）**：

```bash
curl -s -X POST http://127.0.0.1:10086/command -d '{"action":"close_session","args":{},"session":"zhihu-draft"}'
```

## 禁忌

- 不替用户实际提交/发布任何回答，绝不点发布按钮。
- 禁止只看问题标题就起草；未读问题完整描述写出的稿子必须作废重写。
- 起草不编造第一手体验；用户未提供的设备/经历不写进回答，涉及参数先核查再落笔。
- 禁止安排同一自然日发布多篇带货回答。
- 配图红线：草稿配图不足 3 张不得交付；真实图（媒体实拍/测评图、官方图）必须 ReadMediaFile 回看核实过且与内容相关；AI 生成图仅限流程图/决策图/思维导图等示意类、或内含媒体实拍/测评图的合成图，其余 AI 图严禁使用；不向用户索要实拍图。
- 去 AI 味只借 khazix-writer 风格内核，不套公众号固定尾部；固定引流链接的标题一字不动。
