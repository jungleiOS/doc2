# 如何看待 anthropic 取消 git？

先把结论放在前面：git 不会被这件事取代。但 Anthropic 换掉 git 的理由是站得住的：从公开披露看，他们遇到的负载，还没有第二家公司完整讲出来过。

10 月 13 日，Anthropic 在工程博客发了一篇《Redesigning source control at Anthropic》，披露自研的版本控制系统 Scion 替换了内部巨型 monorepo 的 git，7 个人、5 个月，从立项到全部切完。

划一下范围：内部、自己的 monorepo、替换。意思不是「git 这个软件要死了」，是「我们自己的 git 扛不住了」。

扛不住的程度，看数字。官方披露，内部日均代码合并量从今年 5 月的约 2500 次涨到 9 月的 3 万次以上，峰值单日 30401 次，四个月涨了 12 倍。

![anthropic-merge-growth.png](https://n.uguu.se/UVrPaWWD.png)

*图源：Anthropic 官方工程博客，monorepo 每日合并量变化（2026 年 1–9 月）*

主分支历史接近 100GB，压缩过的工作副本还有 25GB 以上。CI 系统每天要做约 2500 万次代码检出，如果按 git 默认的拉取方式算，每天产生的数据传输量超过 600PB。

![scion-architecture.png](https://d.uguu.se/OniJnCXT.png)

*图源：Anthropic 官方工程博客，Scion 部署架构：镜像副本分发，按需拉取*

这堆数字里藏着真正的分界线。仓库大是一个维度，主分支近 100GB，比 Linux 内核仓库大得多，这个维度 git 生态系统其实见过多回，超大仓库换自研系统也有先例。但这个维度只解释了一半。

另一半是节奏。Linux 的代码是人一行行敲进去的，合入速度由人的 review 决定，一天几十次 merge 就到头了。Anthropic 从 5 月到 9 月合并量涨 12 倍，靠人是敲不出来的，来源是 agent。

git 是 Linus 为前一种节奏设计的：分布式、离线可用、每人本地一份完整副本。这些设计在 2005 年是天才之笔，拿到 3 万次合并一天的负载下，全成了负债。官方原文里有一句大白话：让 git 优秀的那些特性，正在摧毁我们的扩展能力。<!-- 判断句 -->

**所以这不是「仓库变大了」的故事，是「写代码的主体变了」的故事。**前者是规模问题，git 社区对付过很多年；后者是负载类型问题，头一遭。<!-- 判断句 -->

Scion 的取舍全是反 git 的：以服务器为中心，客户端按需拉取，对外全面 API 化，CI 和 agent 可以不拿本地仓库直接操作。换完以后基础设施资源占用降到原来 Git 集群的 1/200。<!-- 判断句 -->

Anthropic 自己把边界划得很清楚。官方在文章里明确说了三句话：Scion 不是 git 的通用替代品；不会开源；普通公司也玩不起，内部那种负载量级放到外面没有几家承受得住。这是给「日均几万次合并」定制的手术，不是给全世界发新药。

![tns-scion-report.png](https://d.uguu.se/JPDzalFK.png)

*图源：The New Stack 报道页，「Anthropic built its own git replacement for AI-scale coding. But you can't have it.」*

还有一层背景：这事不是 Anthropic 首创。Google 有 Piper，Meta 有 Sapling，都是为巨型 monorepo 重造版本控制的先例，Anthropic 文章自己点了名。以前重造版本控制，主要矛盾是人多、仓库大；这次的主要矛盾，是写代码的不是人。**从公开披露看，Anthropic 是第一家被 AI agent 的产码量逼到这一步、并且把全过程公开讲出来的公司。**<!-- 判断句 -->

社区争议也有一桩。这篇博客在 Hacker News 上是当周最热的工程讨论之一，吵得最凶的不是技术，是指控：有前 Meta 工程师指出 Scion 的数据模型和 Meta 的 Mononoke 大量雷同，Bonsai changeset 的结构几乎一样。Anthropic 随后在文章里增补了对 Sapling/Mononoke 的致谢脚注。这个争议目前停留在署名层面，有没有实质抄袭没有定论。<!-- 判断句 -->

很多人看这个新闻的角度是「git 会不会被取代」，我觉得问错了。git 不会被取代，至少十年内你我的工作流里它还是主角。真正的信号是另一句：**AI 写代码不是让人类程序员快了一点，而是让软件工程的负载类型整个变了。**<!-- 判断句 -->

当一天 3 万次合并成为常态，版本控制、CI、代码评审、部署，这整条链路上每一个为人类节奏设计的环节，都会被逐个拿出来重估。Scion 只是第一个被公开的，Antique（他们的新评审工具）是第二个。<!-- 判断句 -->

我是写 Flutter 的，过去一年我的代码基本也是 AI 在写。工具链的每一环还在按「人写代码」的速度设计，而代码的产出速度已经在按 agent 走了。这两条线只要继续分叉，今天看起来像新闻的事，过几年就是行业标配。

git 没死。死的是「代码是人写的」这个默认前提。

---
*2026-10-18 整理；数据来源：Anthropic 官方工程博客《Redesigning source control at Anthropic》（2026-10-13）、The New Stack 报道（2026-10-15）。*

<!-- 判断句清单（供作者仲裁）：
1. 「git 的优点在这个场景下全成了负债」——转述官方，附原文引用支撑
2. 「这不是仓库变大的故事，是写代码的主体变了的故事」——立场主句
3. 「基础设施资源占用降到 1/200」——官方数据
4. 「从公开披露看，第一家被 AI agent 产码量逼到这一步并公开讲出来的公司」——已加「公开披露」限定
5. 「署名争议停留在署名层面，实质抄袭无定论」——事实陈述
6. 「Scion 只是第一个被公开的，Antique 是第二个」——事实+推演，已留「只要继续分叉」条件
7. 「git 没死。死的是『代码是人写的』这个默认前提」——收尾金句
注：开头已按作者要求去掉点名前排高赞回答，改为独立论证（仓库大/节奏快两轴）；个人经历句沿用《AI编程平权还是替代》已定稿口径，待作者最终确认。
-->

<!-- 图片溯源映射（发布前删除本段）
AI编程工作流/Anthropic取消git/anthropic-merge-growth.png -> https://n.uguu.se/UVrPaWWD.png
AI编程工作流/Anthropic取消git/scion-architecture.png -> https://d.uguu.se/OniJnCXT.png
AI编程工作流/Anthropic取消git/tns-scion-report.png -> https://d.uguu.se/JPDzalFK.png
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI编程工作流/Anthropic取消git/zhihu-Anthropic取消git-v1.md"
-->
