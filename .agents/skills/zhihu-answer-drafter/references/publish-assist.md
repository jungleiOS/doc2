# 知乎作答辅助协议（publish-assist）

由 zhihu-answer-drafter 引用；也适用于任何「把知乎草稿填进编辑器」的场景，与选题流程无关。**触发时机（2026-11-20 起）**：只在作者宣布定稿后、由 drafter-common §8 调用；起草与改稿阶段不得提前填编辑器。

## 1. 平台判 AI 创作（限流/制裁）的应对协议

实战记录：2026-08-19 有 3 篇按结构模板直出的回答被判 AI 创作限流，全部废弃，按「去 AI 味」风格重写后才通过。

- **触发特征（复盘推断）**：规整小标题 + 密集 bullet、段落等长、八股连接词（首先/其次/最后）、通篇无口语破绽。结构模板只是思考骨架，成稿必须过「去 AI 味」改写，这是必做项不是可选项。
- **被制裁后**：先向用户要平台通知原文，对照通知调整风格策略，不盲目重写；同主题旧稿直接废弃换角度重写，不在原稿上小修小补；在 `outlines/选题历史.md` 和草稿目录的 AGENTS.md 里标注「已废弃：被判 AI 创作」。
- **发布节奏**：刚被制裁过的高风险期，一次只发一篇，用户确认一篇没被接着制裁再继续下一篇（本轮实测策略：第一篇过了才写第二篇，第二篇过了观察后再写第三篇）。

## 2. 用 ego-browser 把草稿填进知乎编辑器（等用户自己发布）

作者确认定稿后（drafter-common §8 的第二步），直接把成稿填进问题页的编辑器，填完通知作者去点发布。**绝不点发布按钮。**

- 打开问题页 → 点「写回答」：按钮 innerText 带零宽字符（如 `​\n写回答`），用 `includes('写回答')` 匹配，别用 startsWith。
- 知乎编辑器是 **Draft.js**（`.public-DraftEditor-content[contenteditable=true]`）。注入富文本的唯一可靠姿势：构造 `new DataTransfer()`，setData `text/html` + `text/plain`，再 `new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})` 派发到编辑器。
- markdown → HTML 转换规则：段落转 `<p>`，`**加粗**` 转 `<b>`，链接转 `<a>`；`---` 分割线跳过；图片行转成加粗占位段「【此处上传图片：…本地文件 xx】」——占位段只作定位锚点，随后按下面的「图片插入」流程用知乎编辑器的导入图片替换成真实图片，**不留占位给用户手动上传**。
- 注入后必须验证：innerText 字数、`<a>` 链接列表、加粗数（Draft.js 里加粗渲染为 span，查 `getComputedStyle(e).fontWeight>=600` 的叶子节点）、开头句出现次数 = 1（防重复注入）。
- **图片插入（必做：通过知乎编辑器的「导入图片」把草稿里的本地图片插进正文）**：文本注入验证通过后，逐个处理图片占位段——光标定位到占位段 → 触发编辑器工具栏的「图片」按钮 → 上传占位段标注的本地文件（草稿相对路径转绝对路径）→ 上传成功后删除占位段。程序化做法：图片按钮背后是一个隐藏的 `<input type="file" accept="image/*">`，用 `new DataTransfer()` 构造 `File` 列表赋给 `input.files` 再 dispatch `change` 事件即可绕过系统文件框（该选择器尚未实测校准，失效就先 snapshot 找实际的 input；再不行退化为点击「图片」按钮让系统文件框弹出，请用户手选对应文件）。每张图插入后必须验证：编辑器内出现 `<img>` 且 src 已是知乎图床域名（`*.zhimg.com`），不是 blob 占位；全部图片插完后再整体数一遍 `<img>` 数量与草稿图片数一致。
- **改稿时的全量替换是个大坑（2026-08-22 实战）**：`execCommand('selectAll')+delete` 只动 DOM，Draft.js 会从内部模型把旧内容渲染回来；selectAll 后直接 paste 也无效（粘贴发生在 Draft.js 内部光标处，变成追加）。唯一实测可行的清空法：循环派发 Backspace 键事件（keyCode 8）逐字符往回删，删不动了就说明内部光标到了文档头，换 Delete 键（keyCode 46）清剩余部分，直到 innerText 只剩换行再粘贴。单次 `js()` 调用里循环别超过几百次（Runtime.evaluate 会超时），分多批删。**小改动优先让用户在编辑器里手动改，别走全量替换。**

## 2.1 编辑器「导入」实测流程（2026-11-20，替代手动粘贴注入）

成稿 md（图片已是图床外链）可用编辑器「导入」功能整篇灌入，外链图会被知乎自动抓取转存。已固化为脚本 `scripts/publish/import-answer.sh <定稿md> [问题URL]`（底层 `scripts/publish/import-answer.mjs`，走 ego-browser nodejs）。

实测交互链路与选择器：

1. 工具栏「导入」是 `button.ToolbarButton`（innerText 含「导入」），点击后弹出 `.ToolbarV3Menu-container .Menu` 菜单（不是弹窗）。
2. 菜单项是 `button[aria-label=导入文档]`（另一项是「导入链接」= 抓公众号文章，别点错）。
3. 点击后出现 `.Modal--default` 弹窗，tabpanel 里有拖放上传区 `[role=button]`，背后是隐藏 `input[type=file][accept*=md]`（弹窗内）。
4. **文件选择**：点上传区走的是隐藏 input 的 click，`page.waitForFileChooser` 拦截不到（超时）；直接 `page.setInputFiles('.Modal input[type=file][accept*=md]', [md绝对路径])` 可行（CDP DOM.setFileInputFiles，隐藏 input 也能喂）。用 JS 构造 File 手动 dispatch change 的注入法对这个 input **无效**（v1 失败原因：还喂错了工具栏图片那个全局 input）。
5. 导入是后台转换（拉外链图更慢），轮询 `.public-DraftEditor-content` 校验：字数、结尾段重复次数（防旧稿残留）、`img` 数且 src 全部为 `*.zhimg.com`/`pic-private.zhihu.com`。
6. md 预处理在脚本内：剥一级标题（回答标题=问题标题）、剥文尾「图片溯源映射」注释块；前提是图片必须先跑 image-host-upload 换成图床外链。
7. 绝不点发布按钮，导入校验通过后通知作者自己点。

### 2.2 发布后捞回答链接（fetch-answer-url，2026-11-20 起）

作者点完发布后，运行 `scripts/publish/fetch-answer-url.sh <问题URL>`（底层 `scripts/publish/fetch-answer-url.mjs`）：打开问题页 → 找「编辑回答」按钮（只出现在自己已发布的回答卡片上）→ 向上遍历祖先节点取卡片内 `a[href*="/answer/"]` 永久链接 → 输出 `https://www.zhihu.com/answer/{id}`。捞不到按钮 = 发布未成功或页面未加载完，让作者确认后再跑。拿到链接后按 drafter-common §8 第 5 步回填登记（问题对应表状态列改「已发布」+链接，选题历史标注同步，`node scripts/db/sync.mjs`）。
