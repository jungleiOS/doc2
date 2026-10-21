# 多款 3A 老游戏被 AI 光速反编译并移植网页端，将对游戏行业带来哪些冲击？

先给结论：**这波移植潮被冲击最大的不是「游戏玩得到」，而是老游戏重制、移植这门「复制生意」。但厂商怕的也不是玩家白嫖——白嫖的人本来就不掏钱；真正在震动的，是这门生意里「技术复活」这一环的成本。**<!-- 判断句 -->

先看最能打的案例。Maurice Heumann（网名 momo5502）10 月 9 日公布了过去三个月的成果：让 AI agent 花掉 **6000–7000 亿 token**，对 2009 年《使命召唤：现代战争2》做逆向重建，**99.33% 的函数完成重建，83.02% 与原始二进制逐字节一致**（[他本人博客](https://momo5502.com/posts/2026-10-09-game-decompilation/)）。

![mw2-progress.png](https://i.imgs.ovh/2026/10/20/add2600cad7c43a8930be1056763184e.png)

*图源：Maurice Heumann 博客原图，反编译进度环形图，83.02% 字节精确匹配、99.33% 已反编译的数字来自该博客进度图（2026-10-09）*

源码没有公开。他还得防一件事：AI 为了通过验证，偷偷修改比对的验证脚本。

另有两个常被算进「AI 移植潮」的案例，需要剔除。

《命令与征服：将军》（资料片《绝命时刻》）被搬到 iPhone 和 Mac 是其一：Google 的产品设计负责人 Ammaar Reshi 只用 Claude Code 加 Fable 模型就完成了移植，这件事是真的。

但前提是 **EA 在 2025 年 2 月已把《将军》源码按 GPL 协议开源**，他做的是在社区项目基础上适配新平台，仓库里不含游戏素材。官方把代码放了出来，这不算反编译的硬功夫。

![gamelook-03.png](https://i.imgs.ovh/2026/10/20/bc54c738673c0c98879ae8d335f96a88.png)

*图源：GameLook 报道截图，「绝命时刻」移植项目在 iPad 上实机运行的画面（[GameLook，2026-10](http://www.gamelook.com.cn/2026/10/604149/)）*

另一个是 9 月底上线、五小时跑了约两万局的《光环：战斗进化》浏览器版。它基于社区**人工**反编译工程移植到 WebAssembly（一套让原生代码直接在浏览器里跑的技术），AI 扮演了什么角色并不明确。**把一个跑了十几年的人工反编译工程算成 AI 的功劳，是不准确的。**<!-- 判断句 -->

![gamelook-04.png](https://i.imgs.ovh/2026/10/20/23d7129a2ad991615772fa77f0e61866.png)

*图源：GameLook 转引媒体报道截图，「原版《光环》游戏现可在网页浏览器中游玩」（原始报道见 [PC Gamer](https://www.pcgamer.com/hardware/you-can-now-play-halo-combat-evolved-in-a-web-browser-and-it-even-has-multiplayer/)）*

抛开误算的部分，真实情况是：AI 把「读懂老游戏二进制」的成本从几年压到了几个月，但素材版权、引擎授权这些硬门槛一个都没消失。

## 第一层冲击：重制和移植这门「复制生意」

老游戏重制为什么卖得动？它的定价权大头从来不是「懂老代码」这项技术能力，而是素材版权和品牌——这两样是法律垄断，别人拿不到，也不能拿去卖。

AI 反编译威胁的是「技术复活」这一环：读懂二十年前的代码、适配新平台，过去要一个小团队磨一两年，现在 agent 跑三个月。当重建可运行源码的成本塌下来，民间复刻确实能跑起来了。**但素材、商标这些法律门槛反而在升值：民间项目可以跑，不能合法卖钱。厂商真正睡不着的点在这里，而不是「玩家不花钱也能玩到」。**<!-- 判断句 -->

旁证是 Epic：Tim Sweeney 10 月 12 日称 Epic 正在「大规模转向」，把开发人员调去为 AI 加速重构工具链（[原帖](https://x.com/TimSweeneyEpic/status/2109705826688549304)；背景见 [The Verge](https://www.theverge.com/games/1010097/epic-games-disney-project-ai-coding-art)）。头部引擎厂把 AI 重建当基础设施建，等于承认这是行业默认方向。

## 第二层冲击：版权格局，从打地鼠到收编

厂商现在的第一反应是 DMCA（美国管版权侵权下架的法律，版权方拿它命令平台和站点删除内容）。10 月 10 日前后，动视对社区开发者用 AI 代理做的两个《使命召唤》浏览器复刻（素材导出自原作）发出下架。

据 TechPowerUp 报道转述，Faraday 在 X 上的回应是：「动视刚因为我把 CoD 移植到浏览器就 DMCA 了我，他们清空了我所有帖子，所有游戏都已下线」（[TechPowerUp](https://www.techpowerup.com/353601/activision-dmca-takes-down-vibe-coded-call-of-duty-browser-ports)）。

![gamelook-06.jpg](https://i.imgs.ovh/2026/10/20/33c2e7533f42f242b131c6f0f46e9cba.jpg)

*图源：GameLook 转引媒体报道截图，「动视下架 AI 制作的《黑色行动2》浏览器移植版」（原始报道见 [TechPowerUp](https://www.techpowerup.com/353601/activision-dmca-takes-down-vibe-coded-call-of-duty-browser-ports)）*

打地鼠之外，还有一条平行的战线。9 月底公开的 PS5 越狱工具 Relapse，几秒完成、覆盖固件 7.00–13.60——厂商发现连「让旧游戏在新硬件上跑不起来」这条技术退路也在失效。

据媒体报道，PlayStation Store 后台数据显示《GTA6》PS5 版要求固件不低于 14.10，外界推断这是想把游戏推到越狱覆盖范围之外（Rockstar 未确认，[VideoCardz 报道](https://videocardz.com/newz/gta-vi-reportedly-requires-ps5-firmware-14-10-leaving-current-jailbreak-users-behind)）。版本竞速是有尽头的。<!-- 判断句 -->

![gamelook-05.png](https://i.imgs.ovh/2026/10/20/cf45b3752e664ebedff2c33a56f5b325.png)

*图源：GameLook 转引 GitHub 项目页截图，Relapse 的 README 标注支持 PS5 固件 7.00–13.60*

更根本的死局在游戏保存这边。有一群人专门致力于让老游戏在主机停产、商店关闭之后仍然可以被游玩和存档，这个圈子叫游戏保存运动（game preservation）。任天堂 Wii U/3DS 的 eShop 已在 2023 年 3 月停止购买，数百款纯数字发行的游戏从此无法合法购入（已购用户仍可下载，谈不上「绝版」）。

2024 年 2 月，任天堂起诉 Switch 模拟器 Yuzu，约一周后和解：**赔偿 240 万美元、Yuzu 和 3DS 模拟器 Citra 永久停更、交出域名**。这些游戏从此只能从灰色渠道见到。起诉书写的是版权，封掉的是普通玩家仅剩的入口。

![yuzu36-2.jpg](https://i.imgs.ovh/2026/10/20/b43df95204815b98d6d959a0e1e7e3c0.jpg)

*图源：36氪报道配图（标注「图源：Yuzu」），Switch 屏幕上的 Yuzu 模拟器界面（[36氪](https://m.36kr.com/p/2681811922505608)）*

法律上的空间也极小：DMCA §1201 的保存豁免只给图书馆、档案馆、博物馆，且限馆内使用，2024 年的第九轮规则又拒绝了「图书馆远程提供遗弃游戏访问」的申请（[美国版权局](https://www.copyright.gov/1201/2024/)）。官方渠道关了，民间复刻成了事实上的保存通道——但这条通道随时可能挨 DMCA。

所以我的判断是：**版权方从打压转向收编，是这几件事里确定性最高的一步棋。**<!-- 判断句 -->

所谓收编，就是把民间已经在做的事接进官方体系，由官方自己来做。

10 月 13 日微软宣布成立 Xbox Labs，由 Xbox CTO Scott Van Vliet 牵头。公告要探索的方向，正是游戏被快速反编译、重建到 Apple 芯片和浏览器上这一现象（[GeekWire 报道](https://www.geekwire.com/2026/microsoft-forms-xbox-labs-to-explore-game-remixes-ports-and-other-new-frontiers/)）。

![gamelook-08.jpg](https://i.imgs.ovh/2026/10/20/1d32b2e3adf534230a73cc6c9ba923a1.jpg)

*图源：GameLook 转引 X 推文截图，Xbox 负责人官宣 Xbox Labs，高亮段落直陈「游戏被快速反编译重建、跑进浏览器」*

这里要收的不是盗版者，是「老游戏随处可玩」这个已被验证的需求。

1999 年 Napster 让用户免费下载音乐，被唱片业告倒，但免费听歌的需求杀不死；后来 Spotify 用官方授权的订阅流媒体，把这件事做成了正规生意。**微软想做的，就是游戏行业的同一个动作：与其让民间项目拿走叙事和生态，不如官方下场，把这个需求接进自己的分发渠道。**<!-- 判断句 -->

## 国内的样本：仙剑的八年空头支票

国产老游戏是上面所有问题的压缩版。大宇 2017 年宣布重制《仙剑奇侠传》一至三代及外传，至今未落地；2024 年 12 月姚壮宪还在说团队在「《仙剑一》复刻版与全新故事之间做选择」（[3DM 报道](https://www.3dmgame.com/news/202412/3910358.html)）。官方重制八年没影，社区流传的「AI 重写仙剑 95」项目倒是先出现了——只是这个项目没有公开的工程细节，成色如何无从考证。

更早的版本答案是私服灰色生意：网易 2023 年协助破获私服从案 20 起、关停私服 102 个、涉案超 2 亿元（[网易 2023 年度社会责任报告](https://q.stock.sohu.com/newpdf/202457250293.pdf)）。情怀积压越久、官方动作越慢的 IP，被民间复刻抢先的风险越大。

## 收个尾

回到题目：老游戏被 AI 光速搬进浏览器，玩家当然爽，但「玩得到」从来不是一门生意。真正在震动的，是这门生意的成本结构——技术复活变便宜了，素材和品牌这些法律门槛更值钱了。

往后的争夺，不再是「能不能移植」，而是「谁来卖、按什么规则卖」。微软已经把 Xbox Labs 摆上了桌，动视还在一张一张地发 DMCA。

---
*2026-10-20 整理；数据截至 GameLook 2026-10 综述、Heumann 博客（2026-10-09）、美国版权局 §1201 第九轮规则、微软 Xbox Labs 公告（2026-10-13）。*

<!-- 图片溯源映射（发布前删除本段）
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-03.png -> https://i.imgs.ovh/2026/10/20/bc54c738673c0c98879ae8d335f96a88.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/mw2-progress.png -> https://i.imgs.ovh/2026/10/20/add2600cad7c43a8930be1056763184e.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-04.png -> https://i.imgs.ovh/2026/10/20/23d7129a2ad991615772fa77f0e61866.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-06.jpg -> https://i.imgs.ovh/2026/10/20/33c2e7533f42f242b131c6f0f46e9cba.jpg
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-05.png -> https://i.imgs.ovh/2026/10/20/cf45b3752e664ebedff2c33a56f5b325.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/yuzu36-2.jpg -> https://i.imgs.ovh/2026/10/20/b43df95204815b98d6d959a0e1e7e3c0.jpg
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-08.jpg -> https://i.imgs.ovh/2026/10/20/1d32b2e3adf534230a73cc6c9ba923a1.jpg
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI反编译3A老游戏/AI光速反编译冲击游戏行业/zhihu-AI光速反编译冲击游戏行业-v3.md"
-->
