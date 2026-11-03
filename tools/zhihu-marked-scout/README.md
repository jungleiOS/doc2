# 知乎活跃关注者挖掘工具

用途：手动标记关注的用户 → 批量爬取他们的最近 3 条回答 → 从中挑有潜力的问题。

## 组件

- `mark-users.user.js`：Tampermonkey 用户脚本，在知乎页面（个人主页、时间线作者名旁）加「标记」按钮，右下角浮动面板可复制导出 JSON。
- `scrape-answers.mjs`：ego-browser 自动化脚本，读取 `marked-users.json`，用知乎 API v4 批量拉取每个标记用户最近 3 条回答（问题链接、标题、赞同数、日期、摘要）。

## 使用步骤

1. 浏览器装 Tampermonkey 扩展，导入 `mark-users.user.js`。
2. 在知乎浏览时给目标用户点「＋标记」。
3. 点右下角面板「复制JSON」，覆盖写入本目录 `marked-users.json`（格式：`[{ "token": "...", "name": "...", "url": "..." }]`）。
4. 运行（ego-browser 需已安装并登录知乎）：

```bash
ego-browser nodejs < scrape-answers.mjs
```

5. 查看输出 `scraped-answers.json`，按 `createdTime` 新→旧挑题，交 `zhihu-question-scout` 打分。

注意：脚本带 2 秒间隔限速，标记用户多时请分批跑；仅个人选题使用，勿高频批量抓取。
