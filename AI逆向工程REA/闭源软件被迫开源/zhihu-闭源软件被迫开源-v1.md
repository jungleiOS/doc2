# 闭源软件是否都要被迫开源？这事得分人群看

过去一周，GitHub 上最疯的项目是一个专门扒别人软件的项目。

REA，全称 Reverse Engineer Anything，一个 AI 逆向工程工具。接上 Claude Code、Codex 这些 coding agent，它就能拆安卓 APK、拆 Electron 应用、拆编译好的原生二进制，把别人的软件摸个底朝天，然后交给 agent 重写一版功能等价的出来。这个项目今年 4 月就建了，一直不温不火，10 月 10 日突然冲上 GitHub Trending 榜首，到我 12 号截图的时候，star 已经冲到 14 万以上。

![github-rea-repo.png](https://s41.ax1x.com/2026/10/12/pna3hTO.png)

*图源：GitHub morluto/rea 仓库页面截图（2026-10-12），可见 About 栏 "Reverse engineer anything with agents" 及 star 数*

先声明一句：我没跑过 REA，以下是基于公开信息的判断。这个问题底下已经有实测党了，我不抢他们的活，换个角度——**这事对不同类型的人分别意味着什么。**

结论先说在前面：闭源软件「被迫开源」是巨头们的战略问题，和大多数开发者关系不大；真正在收缩的是「把二进制文件卖到用户电脑上、靠拷贝收费」这门已经很旧的生意。而这门生意里不同位置的人，该做的应对完全不一样，下面按人群分开说。

因为「闭源会不会被迫开源」是 Adobe、微软这些公司要操心的战略问题，但「我的软件还卖得动吗」是无数开发者今天要面对的生计问题。这两件事经常被混在一起说，其实得分开。

## 先看清楚：被冲击的到底是哪种生意

和 REA 前后脚火的还有一个人。美国开发者 Brandon Thomas 用 Claude Opus 5.5 加 Rust，做了 ArtCraft 系列，一口气开源了 7 款 Adobe 平替：PhotoCraft 对标 Photoshop、VectorCraft 对标 Illustrator、FilmCraft 对标 Premiere、LightCraft 对标 Lightroom，还有 EffectCraft、DesignCraft 和一款 PDF 工具，全部 MIT/Apache 2.0 协议挂在 GitHub 上，其中 PhotoCraft 一个仓库就拿了 4 万多个 star（[Trendshift 数据](https://trendshift.io/repositories/278138)）。

![zhihu-brandon-adobe-1.jpg](https://s41.ax1x.com/2026/10/12/pna3ofH.png)

*图源：ArtCraft 项目官网，「Seven apps. One craft.」，展示 7 款开源 Adobe 平替*

这还没完。[Tom's Hardware 10 月 11 日的报道](https://www.tomshardware.com/software/microsoft-office/creator-of-free-adobe-clones-unveils-open-source-microsoft-office-excel-powerpoint-and-word-replications-autodesk-tools-and-other-subscription-based-services-may-come-next)说，他又把微软 Office 三件套复刻了——WordCraft、GridCraft、DeckCraft，Word、Excel、PowerPoint 各对应一个，下一步还打算动 Autodesk 的 AutoCAD。

![tomshardware-word-1.1a.jpg](https://s41.ax1x.com/2026/10/12/pna35kD.jpg)

*图源：Tom's Hardware，文章用 Word for Windows 1.1a 的启动画面交代 Office 复刻的历史渊源*

看起来很吓人对吧。但把这两件事拆开来，你会发现被冲击的其实是一种已经很窄的生意：**把二进制文件卖到用户电脑上、靠拷贝收费的生意。**

REA 和 ArtCraft 能复刻的，是「跑在你本地的那份代码」。一份软件的核心价值如果全部装在那个可分发的二进制里，那它确实危险了。可商业软件公司值钱的从来不止这份代码，还有订阅体系、素材生态、云端协作、以及持续几年的更新交付。Adobe 最新一个财年营收 237.7 亿美元，其中订阅收入占 96%（[Adobe FY2025 财务数据](https://fourweekmba.com/adobe-financials/)）——靠卖软件拷贝赚钱这件事，Adobe 自己早就做完了。<!-- 判断句 -->

![adobe-creativecloud-pricing.png](https://s41.ax1x.com/2026/10/12/pna3Ite.png)

*图源：Adobe 官网 Creative Cloud 定价页（2026-10-12），全系订阅制，单应用 US$22.99/月起*

反过来，被逆向了三十年依然活得好好的例子也有。WinRAR 官方卖 €29.95 一份的永久授权，40 天试用期过了就弹窗催你买，但[官方从未封堵过期后的无限续用](https://www.win-rar.com/license-perpetual-subscription.html)——那个压缩算法二十年前就被各种破解工具扒干净了。它还能收钱，靠的早不是「你不知道我代码怎么写的」，而是企业授权合规、省心和口碑。<!-- 判断句 -->

顺便一句法律层面的话：逆向工程在美国 DMCA §1201(f)、欧盟软件指令、中国《计算机软件保护条例》第十七条下都有明确的合法例外（互操作和学习研究目的）。REA 没改变法律边界，它改变的是成本——以前逆向一款软件要一个团队磨几个月，现在一个 agent 跑几天。

## 所以回到正题：不同的人该怎么看

**如果你是独立开发者，靠卖小工具 License 吃饭**

这是受冲击最直接的一群人，也是最不需要恐慌的一群人。你的工具真到了「值得被 REA 逆向」的体量，说明它已经有市场了，而那个时刻你的收入结构大概率早该变了。我个人的看法是，小工具作者现在把代码开源出去换 star，反而是最划算的获客方式——REA 时代复刻一个工具的成本趋近于零，藏是藏不住的，那不如自己做那个分发源头，让社区帮你传播，再把变现放到服务层（云端同步、团队协作、托管）去做。<!-- 判断句 -->这个判断欢迎评论区讨论，我知道有反例。

**如果你是创业公司或小团队，核心产品是一个可下载的软件**

需要调整的是默认假设：**从今天开始，你的二进制要按「发布即被逆向」来对待。**<!-- 判断句 -->这不是说别做了，而是说别把护城河押在代码保密上。壁垒往数据积累、网络效应、交付速度上挪——这些东西 agent 逆向不出来，因为它不在你分发的那个文件里。

**如果你是大厂程序员**

短期无感。你们公司的法务和架构师会先把 REA 这类工具挡在流程外，闭源合规要求不会因为一个开源项目松动。但长期有一个真问题：过去很多团队的存在理由是「维护闭源代码的护城河」，当这个护城河的逻辑变了，岗位结构会跟着变。<!-- 判断句 -->这和 AI 编程替代的是同一波调整，不是新故事。

**如果你只是普通用户**

短期是纯利好。Photoshop 的 70% 功能免费替代，对非专业用户来说确实够用。但有一个坑要提醒：网上流通的「逆向复刻版」软件，供应链安全没人背书，跑在你电脑上的东西来源不明，比官方订阅版的风险高得多。<!-- 判断句 -->

## 最后

「闭源软件是否被迫开源」这个问题，我倾向于认为它问错了对象。真正被 REA 逼到墙角的，是「本地分发 + 卖拷贝」这一个已经很旧的商业模式，而这个模式的衰退在 agentic coding 起来之前就开始了，REA 是加速器，不是起点。<!-- 判断句 -->

对绝大多数开发者来说，值得操心的不是「开源还是闭源」这个名义之争，而是自己的收入来源里，有多少还押在「别人拿不到我的代码」这个前提上。押得越多，越该现在就想退路。

---
*2026-10-12 整理；数据截至 GitHub morluto/rea 仓库页（截图当日）、Tom's Hardware 2026-10-11 报道、Adobe FY2025 财务数据及 Trendshift 仓库统计。*

<!-- 图片溯源映射（发布前删除本段）
AI逆向工程REA/闭源软件被迫开源/github-rea-repo.png -> https://s41.ax1x.com/2026/10/12/pna3hTO.png
AI逆向工程REA/闭源软件被迫开源/zhihu-brandon-adobe-1.jpg -> https://s41.ax1x.com/2026/10/12/pna3ofH.png
AI逆向工程REA/闭源软件被迫开源/tomshardware-word-1.1a.jpg -> https://s41.ax1x.com/2026/10/12/pna35kD.jpg
AI逆向工程REA/闭源软件被迫开源/adobe-creativecloud-pricing.png -> https://s41.ax1x.com/2026/10/12/pna3Ite.png
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI逆向工程REA/闭源软件被迫开源/zhihu-闭源软件被迫开源-v1.md"
-->
