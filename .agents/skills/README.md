# Agent Skills 索引

> 本仓库已配置 15 个 Skill。执行对应任务时先读取对应 `SKILL.md` 的完整内容，按其中的流程、模板、禁忌执行，并在写作完成后按其中的质量检查清单自检。

| Skill | 路径 | 触发场景 |
|-------|------|---------|
| `khazix-writer` | `.agents/skills/khazix-writer/SKILL.md` | 写公众号长文、续写、扩写、按风格出稿 |
| `zhihu-viral-answer` | `.agents/skills/zhihu-viral-answer/SKILL.md` | 写知乎回答、知乎体、高赞爆款 |
| `frontend-design` | `.agents/skills/frontend-design/SKILL.md` | 封面、图集、思维导图等视觉产出 |
| `neat-freak` | `.agents/skills/neat-freak/SKILL.md` | 文档/规则/残留收尾同步（说「洁癖」或「收尾」时触发） |
| `zhihu-question-scout` | `.agents/skills/zhihu-question-scout/SKILL.md` | 用 ego-browser 抓知乎关注的问题/邀请回答/推荐问题（优先级：关注 > 邀请 > 推荐），结合已有文章每次选 3 个值得答的问题（说「选题」「看看知乎邀请」时触发）；确认题目后交给 `zhihu-answer-drafter` 起草 |
| `zhihu-hot-scout` | `.agents/skills/zhihu-hot-scout/SKILL.md` | 热榜速报：抓全站热榜+数码话题榜，领域速滤后只给「抢/弃」二元判断（不打分），点头后交 `zhihu-answer-drafter` 热点快车道（说「看看热榜」「今天热榜」「抢热点」时触发；每日「抢」上限 2 条） |
| `zhihu-answer-drafter` | `.agents/skills/zhihu-answer-drafter/SKILL.md` | 把确认的知乎问题写成回答初稿：读问题完整描述 → 按 zhihu-viral-answer 成稿 → 事实核查 → 配图（≥4 张真实图）→ 去 AI 味 → 数据准确性校验 → GEO 审查 → 存档登记（说「起草回答」「写这个题」「按选题单起草」时触发；也被 scout 选题确认后调用；作答辅助协议在 `references/publish-assist.md`） |
| `zhihu-comment-replier` | `.agents/skills/zhihu-comment-replier/SKILL.md` | 用 ego-browser 批处理知乎回复：抓当天收到的评论 → 定位来源 → 按策略筛选 → 生成草稿逐条经用户审核后代发（说「回复评论」「看看谁回复了我」「批处理回复」「清评论」时触发；批次日志存 `zhihu-auto-reply/`） |
| `zhihu-answer-tracker` | `.agents/skills/zhihu-answer-tracker/SKILL.md` | 回采自己已发布回答的表现数据（阅读/赞同/评论/收藏/喜欢 + 问题页排名），回写 `outlines/选题历史.md` 复盘行，喂 scout 5.4 校准回路；快照存 `analytics/`（说「回采」「复盘」「看看我的回答表现」时触发） |
| `zhihu-haowu-evaluator` | `.agents/skills/zhihu-haowu-evaluator/SKILL.md` | 评估问题/已有回答值不值得插好物卡片（说「好物评估」「值不值得插好物」「回填好物」时触发；也被 scout 选题精评调用） |
| `zhihu-geo-optimizer` | `.agents/skills/zhihu-geo-optimizer/SKILL.md` | 知乎内容 GEO/SEO 审查：标题、正文、结尾的机器可读性优化，让内容被站内搜索、百度、AI 搜索引擎（DeepSeek/豆包/Kimi/知乎直答）优先引用（说「GEO」「SEO」「搜索流量」「被 AI 引用」「关键词布局」时触发；也被 zhihu-answer-drafter 起草流程在去 AI 味之后调用；调研证据库在 `references/geo-research.md`） |
| `zhihu-to-baijiahao` | `.agents/skills/zhihu-to-baijiahao/SKILL.md` | 把知乎回答/文章转写为百家号版：SEO 化改写（长尾词标题 + 问答式结构 + 搜索关键词字段），赚百度搜索长尾；含合规时序与数据回收（说「转百家号」「百家号版」「同步到百度」时触发；策略依据 `知乎回答转写多平台_横纵分析报告.md`） |
| `gzh-design` | `.agents/skills/gzh-design/SKILL.md` | 公众号文章排版：Markdown/docx/pdf/纯文本 → 可直接粘贴进公众号编辑器、不掉格式的 HTML（6 套主题 + 主题生成器，自动章节编号、关键词下划线、引言卡与目录；说「公众号排版」「微信排版」「gzh」「一键排版」时触发；由 skills CLI 安装，源仓库 [isjiamu/gzh-design-skill](https://github.com/isjiamu/gzh-design-skill)） |
| `hv-analysis` | `.agents/skills/hv-analysis/SKILL.md` | 横纵分析法深度研究（纵轴时间叙事 + 横轴竞品对比 + 交汇洞察），产出 PDF 研究报告（说「横纵分析」「深度研究」「调研一下」时触发） |
| `image-host-upload` | `.agents/skills/image-host-upload/SKILL.md` | 把文章里的本地图片一键上传到免费临时图床（几小时自动过期），原地替换为外链 URL + 文尾自动追加图片溯源映射块，供知乎/百家号编辑器转存（说「传图床」「图片换外链」「临时图床」时触发；也被 zhihu-answer-drafter 配图完成后和 zhihu-to-baijiahao 定稿后调用） |
