iPhone 接力，官方英文名 iPhone Handoff。跟苹果现有的「接力」功能同名，但做的完全是另一件事。

先说结论，**两台 iPhone 共享同一个手机号，来电双机同振，任选一台接听。对海外多设备用户是真香，对国行用户大概率是「看看就好」。**

## 这功能到底是什么，跟一号双终端和双卡有什么区别

问题里提到了两个常见方案，先逐个比清楚。

**一号双终端**（Apple Watch 蜂窝版用的就是这套）。手表和手机共享号码，但手表是配件，不是独立手机。你不能用手表刷抖音、导航、看视频。iPhone Handoff 是两台完整的 iPhone 共享号码，每台都能独立跑所有 App。

**双卡双待**。一台手机插两张卡，两个号码。你接电话时得知道这个电话是打到卡 1 还是卡 2 的，回消息也得选哪张卡发。iPhone Handoff 是一台手机一个号码，两台手机同一个号码，不存在「这张卡还是那张卡」的纠结。

**一句话区分**，一号双终端是手机+配件，双卡是单机双号，iPhone Handoff 是双机同号。

技术实现上，iPhone Handoff 基于 eSIM。你的主 iPhone 保留主 eSIM，第二台 iPhone 接收一个 companion eSIM，两台设备共享同一个蜂窝身份。不是呼叫转移。呼叫转移是 A 号码打进来转到 B 号码，iPhone Handoff 是两台设备拥有同一个蜂窝身份，外面看就是一个号，来电两台同时响，你选哪台接都行。

设置路径是「设置 → 蜂窝网络 → 指定 main / companion」。蜂窝配置只能在主设备上改，定位服务动态绑定到当前激活的那台。

![iOS 27 iPhone Handoff 功能界面，显示「Use Number on This iPhone and Another」选项](images-iphone-handoff/handoff-intro-technerdiness.jpg)
_图源 Technerdiness_

## 哪些人真正需要

**场景一，旧 iPhone 当「随便造」的备用机。**

这是 MacRumors 评论区最高赞（62 赞）认可的用法。去海滩、去酒吧、去旅行，带旧 iPhone 出去，主 iPhone 留家里保险箱。旧手机丢了不心疼，里面没有银行 App 和密码。但别人捡到后打你号码，它照样响铃，你可以用主 iPhone 接听。

风险隔离，这是最实在的价值。

![iOS 27 蜂窝网络设置与 iPhone Handoff 界面并排展示，左侧为 Cellular 设置页，右侧为 Handoff 配对界面](images-iphone-handoff/handoff-setup-technerdiness.jpg)
_图源 Technerdiness_

**场景二，形态互补。**

iPhone 18 Pro Max 当拍照主力，iPhone Duo 折叠屏当阅读娱乐机。两台设备一个号码，不用多办一张卡。出门带两台，Pro Max 拍完照直接通过 AirDrop 传给 Duo 在大屏上修图编辑。

**场景三，旅行场景。**

出国用旧手机导航、翻译、打电话，主手机放酒店保险箱。丢了不泄露敏感数据，但号码不失联。

## 国内落地面临哪些限制

**这是最大的信息差。**

iPhone Handoff 完全依赖 eSIM 技术。而中国大陆的 iPhone 不支持 eSIM，2018 年 iPhone XS 起国行就砍掉了 eSIM，只保留实体 SIM 卡槽。iPhone 18 Pro 和 iPhone Duo 国行版同样没有 eSIM 模块。

没有 eSIM，就没有 companion eSIM，iPhone Handoff 在国行设备上从硬件层面就跑不起来。

运营商层面，全球首批支持的是 T-Mobile（美国）、T-Mobile（德国）、Verizon 和 EE（英国）。中国三大运营商（移动、联通、电信）没有一个在支持列表里。即使未来国行 iPhone 重新支持 eSIM，运营商也需要单独适配这个功能，短期内看不到希望。

![iPhone Handoff 首批支持运营商，包括 T-Mobile、T-Mobile DE、Verizon 和 EE](images-iphone-handoff/handoff-carriers-pcmag.png)
_图源 PCMag_

## 值不值得为了这个功能买两台 iPhone

不值得专门为此买。

iPhone Handoff 是一个「锦上添花」的功能，不是「非它不可」的功能。如果你本来就有一台旧 iPhone 留着吃灰，又刚入了 iPhone Duo 或 18 Pro，那这个功能让旧机重新有了价值。如果你只有一台 iPhone，或者你在国行，这个功能跟你没关系。

**一句话讲透，iPhone Handoff 是给多设备用户的便利功能，不是买新 iPhone 的理由。**

苹果给两台 iPhone 之间搭了一座桥，但这座桥目前只通了一半，国行这边还没修过来。

---

**iPhone Handoff 关键参数速查（据 Apple 官网及 MacRumors，截至 2026.9.10）**

| 参数 | 说明 |
|:---|:---|
| 技术基础 | eSIM（companion eSIM） |
| 核心能力 | 两台 iPhone 共享同一号码 |
| 设置路径 | 设置 → 蜂窝网络 → main/companion |
| 设备要求 | 两台均需 iOS 27（iPhone 15 及以后） |
| 首批运营商 | T-Mobile（美/德）、Verizon（美）、EE（英） |
| 国行可用性 | ❌ 不支持（无 eSIM 模块） |
| 与一号双终端区别 | 一号双终端是手机+配件，Handoff 是双机同号 |
| 与双卡双待区别 | 双卡是单机双号，Handoff 是双机同号 |

*后续我会写国行 Siri AI 缺失的影响评估。关注我不迷路。*
