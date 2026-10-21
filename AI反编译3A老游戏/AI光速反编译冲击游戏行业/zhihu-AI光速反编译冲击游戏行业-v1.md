# 多款 3A 老游戏被 AI 光速反编译并移植网页端，将对游戏行业带来哪些冲击？

先给结论：**这波移植潮被冲击最大的不是「游戏玩得到」，而是老游戏重制、移植这门「复制生意」本身；厂商的对策，大概率会从 DMCA 打地鼠，走向把民间复刻收编进官方体系——微软刚成立的 Xbox Labs 就是第一个信号。**<!-- 判断句 -->

先把时间线摆出来，因为「AI 光速反编译」这个说法本身就需要拆一拆。

7 月初，Google 的产品设计负责人 Ammaar Reshi 用 Claude Code 加 Fable 模型，把 2003 年的《命令与征服：将军：绝命时刻》原生移植到 iPhone、iPad 和 Mac——ARM64 原生代码，不是模拟器。

但有个前提：**EA 在 2025 年 2 月已把《将军》源码按 GPL 协议开源**，Reshi 只是在社区项目基础上做适配，仓库不含游戏素材。这是一次「官方开闸、AI 施工」。

![gamelook-03.png](https://i.imgs.ovh/2026/10/20/bc54c738673c0c98879ae8d335f96a88.png)

*图源：GameLook 报道截图，「绝命时刻」移植项目在 iPad 上实机运行的画面（[GameLook，2026-10](http://www.gamelook.com.cn/2026/10/604149/)）*

真正称得上「反编译」硬功夫的是 Maurice Heumann 10 月 9 日公布的成果：AI agent 花约三个月、烧掉 **6000–7000 亿 token**，对 2009 年《使命召唤：现代战争2》做逆向重建，**99.33% 的函数完成重建，83.02% 与原始二进制逐字节一致**（[他本人博客](https://momo5502.com/posts/2026-10-09-game-decompilation/)）。源码未公开——他还得防 AI 改验证脚本蒙混过关。

![mw2-progress.png](https://i.imgs.ovh/2026/10/20/add2600cad7c43a8930be1056763184e.png)

*图源：Maurice Heumann 博客原图，反编译进度环形图（2026-10-09）*

而 9 月底上线、五小时跑了约两万局的《光环：战斗进化》浏览器版要说清楚：它基于社区**人工**反编译工程移植到 WebAssembly（一套让原生代码直接在浏览器里跑的技术），AI 扮演了什么角色并不明确。**把一个跑了十几年的人工反编译工程算成 AI 的功劳，是不准确的。**<!-- 判断句 -->

![gamelook-04.png](https://i.imgs.ovh/2026/10/20/23d7129a2ad991615772fa77f0e61866.png)

*图源：GameLook 转引媒体报道截图，「原版《光环》游戏现可在网页浏览器中游玩」（原始报道见 [PC Gamer](https://www.pcgamer.com/hardware/you-can-now-play-halo-combat-evolved-in-a-web-browser-and-it-even-has-multiplayer/)）*

事实层就是这样：AI 把「读懂老游戏二进制」的成本从几年压到几个月，但素材版权、引擎授权这些硬门槛一个都没消失。

## 第一层冲击：重制和移植这门「复制生意」

老游戏重制为什么卖得动？因为「读懂二十年前的代码、适配新平台」要一个小团队磨一两年，官方重制自带稀缺性。

AI 反编译把最贵的那块成本打下来了。当重建可运行源码只要三个月、还能做到八成函数逐字节一致，「只有官方懂这份老代码」就不再是护城河。**稀缺性消失之后，复制生意的定价权也跟着消失**——厂商真正睡不着的点在这里，而不是「玩家不花钱也能玩到」。<!-- 判断句 -->

旁证是 Epic：Tim Sweeney 10 月 12 日称 Epic 正在「大规模转向」，把开发人员调去为 AI 加速重构工具链（[原帖](https://x.com/TimSweeneyEpic/status/2109705826688549304)；背景见 [The Verge](https://www.theverge.com/games/1010097/epic-games-disney-project-ai-coding-art)）。头部引擎厂把 AI 重建当基础设施建，等于承认这是行业默认方向。

## 第二层冲击：版权格局，从打地鼠到收编

厂商现在的第一反应是 DMCA（美国数字千年版权法，发下架通知的经典武器）。10 月 10 日前后，动视对社区开发者用 AI 代理做的两个《使命召唤》浏览器复刻（素材导出自原作）发出下架，对方的回应是「现在每款游戏都可以离线存在了」。

![gamelook-06.jpg](https://i.imgs.ovh/2026/10/20/33c2e7533f42f242b131c6f0f46e9cba.jpg)

*图源：GameLook 转引媒体报道截图，「动视下架 AI 制作的《黑色行动2》浏览器移植版」（原始报道见 [TechPowerUp](https://www.techpowerup.com/353601/activision-dmca-takes-down-vibe-coded-call-of-duty-browser-ports)）*

但打地鼠打不完。另一个信号是 9 月底公开的 PS5 越狱工具 Relapse，几秒完成、覆盖固件 7.00–13.60。

据媒体报道，PlayStation Store 后台数据显示《GTA6》PS5 版要求固件不低于 14.10，外界推断这是想把游戏推到越狱覆盖范围之外（Rockstar 未确认，[VideoCardz 报道](https://videocardz.com/newz/gta-vi-reportedly-requires-ps5-firmware-14-10-leaving-current-jailbreak-users-behind)）。版本竞速是有尽头的。<!-- 判断句 -->

![gamelook-05.png](https://i.imgs.ovh/2026/10/20/cf45b3752e664ebedff2c33a56f5b325.png)

*图源：GameLook 转引 GitHub 项目页截图，Relapse 的 README 标注支持 PS5 固件 7.00–13.60*

更根本的死局在游戏保存这边。任天堂 Wii U/3DS 的 eShop 已于 **2023 年 3 月 27 日停止购买**，数百款纯数字发行的游戏从此无法合法购入（已购用户仍可下载，谈不上「绝版」）。

民间模拟器本是事实上的保存通道，2024 年 2 月任天堂起诉 Yuzu，约一周后和解：**赔偿 240 万美元、Yuzu 和 Citra 永久停更、交出域名**。

![yuzu36-2.jpg](https://i.imgs.ovh/2026/10/20/b43df95204815b98d6d959a0e1e7e3c0.jpg)

*图源：36氪报道配图（标注「图源：Yuzu」），Switch 屏幕上的 Yuzu 模拟器界面（[36氪](https://m.36kr.com/p/2681811922505608)）*

法律上，DMCA §1201 的保存豁免只给图书馆、档案馆、博物馆，且限馆内使用；2024 年 10 月 28 日第九轮规则又拒绝了「图书馆远程提供遗弃游戏访问」的申请（[美国版权局](https://www.copyright.gov/1201/2024/)）。保存的法律空间几乎为零，民间复刻成了事实上的保存通道——但这条通道随时可能挨 DMCA。

所以我的判断是：**版权方从打压转向收编，是这几件事里确定性最高的一步棋。**<!-- 判断句 -->

10 月 13 日微软宣布成立 Xbox Labs，由 Xbox CTO Scott Van Vliet 牵头，公告白纸黑字写着要探索「游戏被快速反编译、重建进入 Apple Silicon 和浏览器」（[GeekWire 报道](https://www.geekwire.com/2026/microsoft-forms-xbox-labs-to-explore-game-remixes-ports-and-other-new-frontiers/)）。

与其让民间项目拿走叙事和生态，不如官方下场，把「老游戏随处可玩」变成自己的分发渠道——音乐行业从 Napster 到 Spotify 已经演过一遍了。<!-- 判断句 -->

![gamelook-08.jpg](https://i.imgs.ovh/2026/10/20/1d32b2e3adf534230a73cc6c9ba923a1.jpg)

*图源：GameLook 转引 X 推文截图，Xbox 负责人官宣 Xbox Labs，高亮段落直陈「游戏被快速反编译重建、跑进浏览器」*

## 国内落点

国产老游戏是上面所有问题的压缩版。大宇 2017 年宣布重制《仙剑奇侠传》一至三代及外传，至今未落地；2024 年 12 月姚壮宪还在说团队在「《仙剑一》复刻版与全新故事之间做选择」（[3DM 报道](https://www.3dmgame.com/news/202412/3910358.html)）。官方重制八年没影，民间「AI 重写仙剑 95」倒是先出现了（据聚合媒体报道，[什么值得买转载](https://post.smzdm.com/p/ad7mm70d/)）。

更早的版本答案是私服灰色生意：网易 2023 年协助破获私服刑案 20 起、涉案超 2 亿元（[南方都市报](https://m.mp.oeeee.com/oe/BAAFRD000020230427790543.html)）。情怀积压越久、官方动作越慢的 IP，被民间复刻抢先的风险越大。

## 收个尾

回到题目：老游戏被 AI 光速搬进浏览器，玩家当然爽，但「玩得到」从来不是一门生意。真正在震动的，是「只有我能合法复制这份老代码」这个前提——重制定价靠它，DMCA 下架靠它，连保存运动都在围着它转。

前提松动之后，争的就不再是「能不能移植」，而是「谁来移植、按谁的规则移植」。微软已经站到了收编那一侧，动视还站在打地鼠那一侧。接下来一两年，每个手握老 IP 的厂商都得选一边站。

---
*2026-10-20 整理；数据截至 GameLook 2026-10 综述、Heumann 博客（2026-10-09）、美国版权局 §1201 第九轮规则（2024-10-28）、微软 Xbox Labs 公告（2026-10-13）。*

<!-- 图片溯源映射（发布前删除本段）
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-03.png -> https://i.imgs.ovh/2026/10/20/bc54c738673c0c98879ae8d335f96a88.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/mw2-progress.png -> https://i.imgs.ovh/2026/10/20/add2600cad7c43a8930be1056763184e.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-04.png -> https://i.imgs.ovh/2026/10/20/23d7129a2ad991615772fa77f0e61866.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-06.jpg -> https://i.imgs.ovh/2026/10/20/33c2e7533f42f242b131c6f0f46e9cba.jpg
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-05.png -> https://i.imgs.ovh/2026/10/20/cf45b3752e664ebedff2c33a56f5b325.png
AI反编译3A老游戏/AI光速反编译冲击游戏行业/yuzu36-2.jpg -> https://i.imgs.ovh/2026/10/20/b43df95204815b98d6d959a0e1e7e3c0.jpg
AI反编译3A老游戏/AI光速反编译冲击游戏行业/gamelook-08.jpg -> https://i.imgs.ovh/2026/10/20/1d32b2e3adf534230a73cc6c9ba923a1.jpg
重传命令：node .agents/skills/image-host-upload/upload.js --force "AI反编译3A老游戏/AI光速反编译冲击游戏行业/zhihu-AI光速反编译冲击游戏行业-v1.md"
-->
