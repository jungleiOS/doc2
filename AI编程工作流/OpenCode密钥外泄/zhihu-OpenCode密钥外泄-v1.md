# OpenCode 遭攻击致部分用户 API 密钥外泄，这暴露了哪些安全隐患？

10 月 17 日早上，有一部分开发者醒来发现自己的 OpenAI、Anthropic 账单上多出了几百美元的调用记录——而他们自己一行代码都没跑。

我不是旁观者视角写的这篇。我自己天天用 AI 编程工具，手里也攥着几家的 API key，所以这事我关心的顺序和吃瓜群众不太一样：先搞清楚到底发生了什么，再看「蒸馏攻击」这个官方定性靠不靠谱，最后是我这种普通用户现在该做什么。

先给结论：**这次事件最大的隐患不是那台没关干净的遗留系统，而是「把 API key 托管给第三方工具」这个模式本身；官方「大规模蒸馏攻击」的定性，截至 10 月 21 日没有任何公开技术细节支撑，只能算一个未经证实的说法。**<!-- 判断句 -->下面的时间线和证据都摆出来，你可以自己判断这个结论站不站得住。

先把几个名词用一句话说清楚，不然后面没法聊：**OpenCode 是一个开源的 AI 编程工具（跑在终端里的那种），Console 是它配套的云端团队服务，用来替整个团队保管各家大模型的 API 调用密钥；API key 就是一串调用凭证，谁拿着它谁就能以你的名义调模型、花你的钱。**

## 三天里发生的事，按时间排

这事最早不是官方公布的，是用户自己发现的。

北京时间 10 月 17 日夜间，有用户先于官方在公开渠道说 OpenCode 好像被黑了，并贴出自己收到的异常账单；安全研究员 Matt Johansen 随后晒出了受影响用户收到的通知邮件截图，配文「Confirmed. OpenCode hacked. Keys stolen」（[X 帖文，约 15.8 万浏览](https://x.com/AGTPinsights/status/2111522657460216015)）。

邮件标题是「Action Required: Potential provider key breach」。正文的关键一句是：「我们发现一个正在停用流程中的遗留系统遭到了未授权访问，保存在你工作区里的第三方厂商密钥（比如 OpenAI、Anthropic）可能已经暴露」（[dev.to 对邮件原文的完整转录](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。

遗留系统（legacy system）就是还在服役、但早没人维护的老旧组件，很多企业事故都出在这类「还没关干净」的系统上。

![通知邮件-devto转录截图.png](https://s41.ax1x.com/2026/10/21/pnBJ81S.png)

*图源：dev.to 对 OpenCode 通知邮件原文的转录，含「legacy system」表述和 Johansen 的 X 帖引用*

官方的公开声明比第一条用户爆料晚了将近 4 个小时，北京时间 10 月 18 日凌晨 1 点 56 分才在 X 上发出来：

「昨晚发生了一起与大规模蒸馏攻击相关的安全泄露，影响了 1.4% 的 OpenCode Console 用户。我们已邮件通知全部受影响用户。没收到邮件就没受影响，只有绑定了外部服务商的那部分账号在波及范围里。事件仍在处理中，暂时无法分享更多细节，我们正在与 Anthropic、OpenAI 和 Google 一起处置。」

（[Pasquale Pillitteri 对官方声明及各方口径的汇总](https://pasqualepillitteri.it/zh/news/25141/opencode-gongji-api-miyao-openai-anthropic-google)、[网易 AI 快报](https://www.163.com/dy/article/L9L5QBAB0531G0IB.html)）

![官方X声明-汇总页截图.png](https://i.imgs.ovh/2026/10/21/3c5c8495d0f54efeff1acdef455186a4.png)

*图源：Pasquale Pillitteri 汇总页对 OpenCode 官方 X 声明原文的引用*

后续还有三个实锤进展。

一是维护者、联合创始人 Dax Raad 当天说攻击者持续 48 小时在尝试入侵，团队全天候加固，他自己个人账号也在被攻击（[dev.to](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)、[IT时代网](https://www.itsdw.cn/news/37419.html)）。

二是三家厂商陆续出手：Anthropic 和 Google 直接封锁了各自认为暴露的 key，OpenAI 与 OpenCode 合作恢复了受影响账号的访问（[TechCrunch](https://techcrunch.com/2026/10/19/hackers-hit-ai-coding-tool-opencode-running-up-charges-on-users-ai-accounts/)）。

三是有用户报告被刷出的账单在数百美元量级（[TechCrunch](https://techcrunch.com/2026/10/19/hackers-hit-ai-coding-tool-opencode-running-up-charges-on-users-ai-accounts/)、[嬴政资讯](https://www.winzheng.com/article/opencode-distillation-attack-api-key-breach-2026)）。

![techcrunch-报道配图-cyberattack.jpg](https://i.imgs.ovh/2026/10/21/f710425ab7b0eb9b219576d5a96c0d2c.jpg)

*图源：TechCrunch 报道配图*

## 「蒸馏攻击」这个定性，现在先别急着信

官方声明里最受关注、也最容易被直接引用走的就是「大规模蒸馏攻击」这个词。

蒸馏本身是 AI 行业的正规术语：用一个强模型的输出来训练弱模型，Anthropic 今年 2 月的官方文章就是这么定义的。<!-- 事实：Anthropic 对 distillation 的定义，见 dev.to 转引 -->

官方把它放进安全事件的定性里，暗示攻击者偷 key 的目的是批量调前沿模型、拿回答去喂自己的模型。这个说法能同时解释「偷 key」和「异常账单」两个现象，逻辑上确实顺。

但注意，到现在为止它只是一个顺的说法，不是一个被证明的说法。<!-- 判断句 -->OpenCode 自己声明了「事件仍在进行，无法分享更多细节」；攻击者具体怎么进的遗留系统、待了多久、拿走了多少 key，官方一个都没公布（[dev.to 对官方口径的整理](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。「1.4%」的基数是多少也没披露，谁也推算不出绝对人数，所有「约 X 万用户」的说法目前都是无源之水。

还有一条在从业者圈里流传但未经官方确认的信息：有安全从业者称这些 key「疑似明文存储」。<!-- 事实+判断：转述口径，未经官方确认 -->这句话出自 [Soups Ranjan 的 X 帖](https://x.com/soupsranjan/status/2111553425376993644)，目前只有这一处信源，官方没确认也没否认。写这篇的时候我把它标在这里，就是想让读的人知道证据级别——它比「蒸馏攻击」的定性证据还要薄一层。

我的意思不是官方在撒谎，而是：**在安全事件里，定性的措辞本身就是叙事的一部分。**<!-- 判断句 -->「被入侵导致 key 泄露」和「遭大规模蒸馏攻击」描述的是同一件事，但后者天然把视线引向「攻击者是谁、要干什么」，而不是「为什么一个正在下线的遗留系统还连着存 key 的生产库」。<!-- 判断句 -->

## 真正值得怕的，是那串 key 不认人

把这件事和 XZ 后门、npm 投毒放在一起看，形态是像的：你引入的某个第三方组件，在你看不见的地方握着你的生产凭证。<!-- 判断句：类比判断 -->

但要讲清楚，这次不是投毒——代码本身没人动手脚，入口是一个没人管的遗留系统被直接访问了。<!-- 判断句 -->类比只是用来说明一件事：**AI 编程工具正在变成新的供应链盲区。**<!-- 判断句 -->

为什么盲区偏偏在这里。传统的软件供应链管的是「你引入的代码是谁写的」；而 AI 编程工具链多了一条过去不存在的链路——**你的凭证被托管在别人的服务里**。<!-- 判断句 -->

OpenCode Console 这个产品的设计初衷其实合理：团队共用厂商账号，成员「不需要看到真实 key 就能调模型」，key 由网关统一保管（[OpenCode Console 服务商文档的说明](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。

问题在于，网关替你保管的那串 key 是活的，刷掉的钱记在你卡上——**key 这个东西不认人，谁拿到谁就是你，账单照寄。**<!-- 判断句 -->从你把 key 粘进那个输入框的一刻起，这台服务器、它的遗留系统、它的下线流程，全变成了你的攻击面的一部分。<!-- 判断句 -->

![代存key链路示意.png](https://s41.ax1x.com/2026/10/21/pnBJJXQ.png)

*图源：自绘示意，链路关系依据 OpenCode 官方文档与本次事件公开口径整理*

另一个容易被漏掉的细节：本地 CLI 里用 /connect 命令存的 key 是留在你自己机器上的（存在本机的一个配置文件里），官方口径是本次事件不涉及本地 key（[dev.to 对范围的说明](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。

所以**「用不用 OpenCode 客户端」和「key 泄没泄露」是两回事，只看你的 key 有没有存进过 Console 工作区。**<!-- 判断句 -->

顺带说一个比事件本身更有预示性的插曲：据报道，OpenCode 团队在这次处置里，用来防御分析的前沿模型因为安全网关的原因，多次拒绝分析攻击流量，直到拿到更高权限才好转（[TechCrunch 转述](https://feinterview.poetries.top/ai-monitor/news/hackers-hit-ai-coding-tool-opencode-running-up-charges-on-users-ai-accounts)、[品玩](https://www.163.com/dy/article/L9MAFRHK05566WT8.html)）。

攻击者拿 AI 的 key 刷 AI，防御方的 AI 被自己的安全策略挡住——这个荒诞闭环大概率不是最后一次出现。<!-- 判断句 -->

## 如果你把 key 存进去过，现在该做什么

官方邮件里的建议是三件事：吊销重签、更新用到旧 key 的应用、检查近期用量。我按三家分别写清楚路径，这几条都来自各家官方文档和上述报道的转述：

**吊销重签。** Anthropic 的 key 在控制台 API keys 页面直接 revoke，官方支持文档的口径是「疑似泄露应立即吊销」；OpenAI 同样在 platform.openai.com 的 API keys 页面删除重建；Google 的路径稍微绕一点——先在 AI Studio 创建新 key，再禁用旧 key（[dev.to 对三家路径的整理](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。

换完别忘了把 CI、脚本、Console 工作区里引用旧 key 的地方全部更新一遍。

吊销后可以顺手验证旧 key 真死透了：对两家 API 各发一条带旧 key 的请求，返回 401 才算吊销成功（[验证方法来源同上](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)）。

**查用量。** 至少回溯到 10 月 16 日，官方没说攻击者待了多久，能查多远查多远。Anthropic 看 usage 和 logs 页面，Google 看 billing 和 usage logs。

**设上限。** 这是很多人漏掉的一步。Anthropic 支持按 workspace 设置消费上限，但默认工作区不支持，需要给 key 单独建一个工作区并设低额度；OpenAI 在 platform.openai.com/settings/organization/limits 里可以设置组织月消费预算；Google 的 key 可以勾选「Restrict to Gemini API only」，就算再泄露，攻击者也不能拿它调 Google 的其他 API（[dev.to](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)、[OpenAI 官方帮助中心](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)）。

如果你没收到 OpenCode 的邮件，按官方口径你不在受影响范围里。但只要你的 key 存进过 Console 工作区，趁调查还没结束花几分钟轮换一遍，成本几乎为零。<!-- 判断句 -->

最后一个习惯，比这次事件重要：一个第三方服务一把专属 key，再给这把 key 设上消费上限。<!-- 判断句 -->这样下次任何一个工具出事，你吊销一把 key 就知道该看谁家的账单——出事的工具会换名字，「一把钥匙开一把锁」的道理不会过时。<!-- 判断句 -->

---

**参考来源**：
- [TechCrunch：Hackers hit AI coding tool OpenCode, running up charges on users' AI accounts](https://techcrunch.com/2026/10/19/hackers-hit-ai-coding-tool-opencode-running-up-charges-on-users-ai-accounts/)（2026-10-19）
- [dev.to：OpenCode Told 1.4% of Console Users to Revoke Their OpenAI and Anthropic Keys（含通知邮件原文转录与三家吊销路径）](https://dev.to/gabrielanhaia/opencode-told-14-of-console-users-to-revoke-their-openai-and-anthropic-keys-561)（2026-10-17）
- [Pasquale Pillitteri：OpenCode 遭攻击事件汇总（官方 X 声明原文引用）](https://pasqualepillitteri.it/zh/news/25141/opencode-gongji-api-miyao-openai-anthropic-google)
- [The Hacker News：OpenCode Console Breach May Have Exposed OpenAI, Anthropic, and Google API Keys](https://thehackernews.com/2026/10/opencode-console-breach-may-have.html)（2026-10-19）
- [X（Matt Johansen / AGTPinsights 时间线）](https://x.com/AGTPinsights/status/2111522657460216015)、[X（Soups Ranjan，明文存储转述口径）](https://x.com/soupsranjan/status/2111553425376993644)
- [网易 AI 快报（含官方声明时间点与「蒸馏攻击」定性）](https://www.163.com/dy/article/L9L5QBAB0531G0IB.html)（2026-10-18）
- [IT时代网（联合创始人 Dax Raad「48 小时持续攻击」表态）](https://www.itsdw.cn/news/37419.html)
- [嬴政资讯：事件复盘（账单量级）](https://www.winzheng.com/article/opencode-distillation-attack-api-key-breach-2026)
- [OpenAI 官方帮助中心：Managing projects in the API platform（key 管理/预算）](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)

数据截至 2026-10-21。「明文存储」为单一从业者转述口径，未经官方确认；「蒸馏攻击」定性未公布技术细节，文中相关表述均为「官方未证实」级别。

<!-- 图片溯源映射（发布前删除本段）
AI编程工作流/OpenCode密钥外泄/通知邮件-devto转录截图.png -> https://s41.ax1x.com/2026/10/21/pnBJ81S.png
AI编程工作流/OpenCode密钥外泄/官方X声明-汇总页截图.png -> https://i.imgs.ovh/2026/10/21/3c5c8495d0f54efeff1acdef455186a4.png
AI编程工作流/OpenCode密钥外泄/techcrunch-报道配图-cyberattack.jpg -> https://i.imgs.ovh/2026/10/21/f710425ab7b0eb9b219576d5a96c0d2c.jpg
AI编程工作流/OpenCode密钥外泄/代存key链路示意.png -> https://s41.ax1x.com/2026/10/21/pnBJJXQ.png
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI编程工作流/OpenCode密钥外泄/zhihu-OpenCode密钥外泄-v1.md"
-->
