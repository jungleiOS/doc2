# 大纲与 Demo 计划 v1

> 问题：https://www.zhihu.com/question/2097046792970028613
> 目标平台：知乎回答（知识科普 + 实战排障向）。本文观点：**苹果 2027 年 4 月的门槛不是"升级 SDK"这么简单，真正卡 Flutter 团队脖子的是 UIScene 和工具链迁移；Flutter 官方其实已经备好路（3.47+），但存量项目自己作出来的老毛病才是工作量大头。**
> 调研基准日：2026-10-24。核心信源：
> - 苹果公告《App Store submissions now open for the latest OS releases》(2026-09-09)：https://developer.apple.com/news/?id=k1mtkt1k —— **2027 年 4 月起，上传到 App Store Connect 的 App 必须用 iOS 27 SDK（即 Xcode 27）构建**；只影响新上传的构建，存量已上架版本可继续下载。
> - Flutter 3.47 官方博客（2026-08-12）："prepares our pipelines for iOS, macOS, and Xcode 27"，最低支持版本上调 iOS 13→15 / macOS 10.15→12；**Xcode 27 构建强制 UIScene 生命周期**。
> - Flutter issues：#187781、#187870（Xcode 27 下无法启动）、#190307（iOS 27 偶发启动崩溃）。
> - 上一轮对照：2026-04-28 起已强制 Xcode 26 / iOS 26 SDK。

## 一、文章大纲（知乎回答结构）

1. **先把要求说人话**：2027 年 4 月到底要求什么、不要求什么
   - 要求：新上传的构建必须用 Xcode 27 / iOS 27 SDK 构建（已上架老版本不受影响，但之后想发任何更新——包括一行 bug fix——都先过这道门）。
   - 不要求：灵动岛、Liquid Glass、64 位、重新设计 UI。SDK 版本 ≠ 最低系统版本（升 SDK 构建仍可 target iOS 15+）。
   - 顺带纠偏：很多人还以为是"iOS 26 SDK / 2026 年 4 月"那轮——那轮已经过了；这一轮是 iOS 27。

2. **Flutter 官方到底准备好没有**（破除"Flutter 没升级"的焦虑）
   - 事实：Flutter 3.47（2026-08）已声明为 Xcode 27 铺路，可用 Xcode 27 构建；完整收尾预计 3.50（2026-11）。
   - 所以真正的分岔不是"等 Flutter 发版"，而是：你的**工程**还停在哪个 Flutter 版本 / 哪个年代的原生代码。

3. **真问题一：UIScene 强制迁移**（本文最大信息增量）
   - Xcode 27 + iOS 27 上，没用 UIScene 的 UIKit 应用启动即崩。
   - Flutter CLI 会自动迁移标准工程；但**自定义 AppDelegate 的原生代码、依赖旧生命周期的插件**要手动迁。
   - demo 呈现：崩溃现象 → 手动迁移 diff。

4. **真问题二：老 Flutter 版本 × Xcode 27 能不能硬上**
   - demo 呈现：Flutter 3.24.4 / 3.41.9 老工程直接用 Xcode 27 构建的结果。
   - 结论（依 demo 结果定稿）：老版本能编 ≠ 能发；隐性缺口（engine 未适配、启动崩溃 issue）风险自担；社区过渡方案（Podfile 提 deployment target、补隐私清单、处理 Swift 6 编译错）逐项演示。

5. **迁移实操清单**（从 demo 提炼，可收藏向）
   - 官方路径：fvm/升级 Flutter 到 ≥3.47 + Xcode 27 + Flutter CLI 自动 UIScene 迁移 → 验证。
   - 存量路径（不升 Flutter）：逐项修法 + 风险边界。
   - 验证产物 SDK 版本的小技巧（不看构建日志，直接看 .app 的 DTSDKName）。

6. **避坑提醒**：CI 升 Xcode 27 后"本地能跑线上崩"、Intel Mac 退出、Debug JIT 受限（mprotect failed:13）。

7. **结尾**：一句话总结 + 时间表（现在→2027-04 每个节点该做什么）。

## 一·补、Demo 实测结果（2026-10-24，Xcode 27A266a，Apple Silicon Mac）

| Demo | 结果 | 证据位置 |
|------|------|---------|
| A 老版本×Xcode 27 首构建 | 3.24.4 和 3.41.9 **双双失败**，报错相同：`IPHONEOS_DEPLOYMENT_TARGET 12.0/13.0 低于 Xcode 27 支持的最低 15.0` | 后台日志 bash-xugk0i60 |
| D① deployment target 修复 | pbxproj 改成 15.0 后**两个老版本均构建成功**（16.7s / 13.0s） | 日志 bash-vxnbr410 |
| B 产物 SDK 验证 | 两个老工程的 Runner 二进制 `LC_BUILD_VERSION sdk 27.0`、`DTSDKName = iphoneos27.0` —— **不升级 Flutter 也能产出"SDK 合规"的包**，服务端校验这关能过 | 本机 vtool/plutil 输出 |
| E 官方路径 3.47.8 | stable（2026-10-23 发布）+ Xcode 27 一把过；新模板即 UIScene 架构：`AppDelegate: FlutterImplicitEngineDelegate` + `didInitializeImplicitEngine` + Info.plist 内建 `UISceneConfigurations→SceneDelegate` | 日志 bash-fhduprry |
| C UIScene 崩溃复现 | 模拟器 debug 包构建在两个老版本上均报 `debug_unpack_ios` 架构校验异常（lipo 明明有 x86_64+arm64 仍报错，疑似老工具链在新 Xcode 下的解析兼容问题）→ 改用**最小 UIKit 对照实验**：无 UIScene 老 App（sdk 27.0 编译）装上 iOS 27 模拟器**启动即被系统杀死**，日志原文：`failure in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption : Application failed to launch: UIScene life cycle is required for apps built with this SDK.`；补 SceneDelegate + UIApplicationSceneManifest 后**存活 ✅** | `_demo/scenedemo/{old,new}` |
| D②③ 隐私清单/Swift 6 | 未单独 demo：纯 Flutter 模板构建不触发这两项，属"有第三方 SDK/混编 Swift 老代码"才需要的条件项，文中按条件清单写 | — |

**核心结论（文章脊柱）**：2027 年 4 月的门槛对 Flutter 开发者来说**不是"等 Flutter 发新版"**——Xcode 27 能直接把老 Flutter 工程编出合规包；真正的坑有三层：①工程 deployment target 低于 15.0 直接构建失败（改一行配置的事）；②iOS 27 强制 UIScene，标准 Flutter 工程由 3.47+ 模板/CLI 自动处理，但**自己改过 AppDelegate/写过原生代码的老工程要手动迁**（崩溃原文已拿到）；③老 Flutter 版本的工具链在新 Xcode 下有隐性翻车点（本次实测 sim debug 构建异常、issue #190307 启动崩溃），发版前必须用 iOS 27 模拟器/真机全链路回归。

## 二、Demo 计划（每个 demo 标注：预计耗时 / 完成标准 / 是否入文素材）

| # | Demo | 做法 | 预计耗时 | 完成标准 | 素材 |
|---|------|------|---------|---------|------|
| A | 老版本 × Xcode 27 构建实况 | fvm 3.24.4 / 3.41.9 老工程 `flutter build ios --no-codesign`，记录报错与产物 DTSDKName | 40min | 两个版本各拿到构建结果（成功/失败）+ 产物 SDK 版本证据 | ✅ 入文（截图 + 日志摘要） |
| B | 产物 SDK 版本验证法 | `vtool -show-build` / Info.plist `DTSDKName`、`DTPlatformVersion` 对比官方门槛 | 10min | 同一份 .app 的 SDK 版本可被命令行读出并截图 | ✅ 入文（一行命令截图） |
| C | UIScene 崩溃复现 + 手动修复 | 在 A 的产物上改造 AppDelegate（模拟自定义原生代码），iOS 27 模拟器跑崩溃；再按官方 UIScene 迁移指南修复并跑通 | 60min | 崩溃日志 + 修复后正常启动，两段录屏/截图 | ✅ 入文（核心素材） |
| D | 存量补救三件套 | Podfile `platform :ios, '15.0'` + post_install 对齐、Runner 层补 PrivacyInfo.xcprivacy、Swift 6 编译错处理；逐条验证报错消失 | 45min | 每项修法前后对比（报错 → 通过） | ✅ 入文（做成清单截图） |
| E | 官方路径对照组 | 最新 stable（3.47.x，必要时 fvm 拉取）新建工程 + Xcode 27 构建跑通 iOS 27 模拟器 | 40min | 构建+启动成功，记录 Flutter CLI 自动 UIScene 迁移痕迹 | ✅ 入文（对照表） |
| F | 原生折叠屏布局适配 demo | 手写 UIKit App（`_demo/foldadapt/`），同一套代码按 `horizontalSizeClass` 切单栏/双栏+常驻侧栏；`simctl launch --unfold` 用 `view.traitOverrides` 模拟展开态 | 40min | 编译/安装/启动验证通过（launchctl 存活） | ✅ 入文（代码 + 原理，截图待补） |

**Demo 实测结果见上文「一·补」。已落盘材料（2026-10-24）**：`_demo/oldapp324` `_demo/oldapp341`（Flutter 3.24.4/3.41.9 老工程，pbxproj 已改 15.0，产物在各自 build/ios/iphoneos/）｜`_demo/newapp347`（Flutter 3.47.8 新模板，UIScene 自动迁移实物）｜`_demo/scenedemo/{old,new}`（UIScene 崩溃/修复最小对照，崩溃日志原文见会话记录）｜`_demo/foldadapt`（原生折叠屏布局适配 demo，含全部源码）。

**根因记录（黑屏问题，已解决）**：手工 swiftc demo 启动黑屏的根因是 Info.plist 里 `UISceneDelegateClassName` 写了 `$(PRODUCT_MODULE_NAME).SceneDelegate`——Xcode 构建期变量在手工打包时不被展开，且 swiftc 默认模块名为 `main`，系统找不到 SceneDelegate → 场景静默置空 → 窗口未创建 → 黑屏（进程存活、无日志、无崩溃，极具迷惑性）。修复：swiftc 加 `-module-name FoldAdapt` + plist 写死 `FoldAdapt.SceneDelegate`。教训：对比 Flutter 工程 plist 应作为第一排查项，而非怀疑环境。**另有截图坑**：Duo 是双屏，`simctl io screenshot` 默认截 LCD-1（主屏），应用在另一块屏上时必须 `--display LCD` 指定；`screenConfig power` 硬切双屏会触发 "system shell probably crashed"，折叠切换应走 DeviceHub 的折叠控件。

**foldadapt v4 重做结果（2026-10-24 22:15，用户反馈"demo 太单调、看不到适配"后重做）**：放弃 v2 手写裸布局 + v3 UISplitViewController（v3 实测翻车：compact 初始栏选择 delegate 在直接以 compact 启动时不生效，启动直愣愣显示 secondary；且 386pt 窄宽下 traitOverrides 报 regular split 拒绝展开双栏——原因未深挖，作为存疑记录，不写成结论）。**v4 改回手动布局，并把适配考点做实**：
- 单文件演示 7 个考点：sizeClass 布局分支 / SelectionStore 选中态跨形态保持 / 详情从 store 恢复 / 折叠态 push 独立详情实例（**一个 VC 不能挂两个父容器**，实测复用实例 push 即闪退退回桌面）/ traitOverrides 强制形态 / UIScene 合规架构 / HUD 实时显示 traitCollection。
- 启动参数：`forceRegular` `forceCompact` `autoSelect`（命令行无法点屏幕，用启动参数驱动交互截图）。
- **素材四件套已齐**（`_demo/foldadapt/`）：
  - `v4_折叠态_单栏列表.png` —— 外屏真实折叠态，HUD: 真实 compact → 生效 compact
  - `v4_折叠态_push详情.png` —— 单栏导航栈 push 详情（返回键可见）
  - `v4_展开态_双栏.png` —— HUD 明示「真实 compact → 强制 regular」的 traitOverrides 模拟
  - `v4_展开态_双栏选中.png` —— 双栏 + 条目2 黄色选中高亮 + 右栏详情
- 已知代价：展开态截图是 traitOverrides 强制（HUD 已诚实标注），真展开主屏（2007×2853）截图仍需 DeviceHub 折叠控件触发；命令行切屏（screenConfig power）必崩 shell，DeviceHub 无 AppleScript 可点性。
- v1/v2/v3 残留截图已清理（duo_*.png / shot_*.png / v3_*.png 删除）。
- **已转为标准 Xcode 工程（2026-10-24 晚）**：`project.yml`（xcodegen）→ `FoldAdapt.xcodeproj`，`xcodebuild` 对 iPhone-Duo-Demo 模拟器 BUILD SUCCEEDED。注意：源文件从 `main.swift` 改名为 `AppMain.swift`（Xcode 下 main.swift 顶层代码入口与 `@main` 属性冲突，编译报错），命令行手工构建命令同步把 `main.swift` 换成 `AppMain.swift` 即可。
- **第二个黑屏根因（同日，Xcode 工程版）**：xcodegen 的 `info:` 配置会**重新生成 Info.plist**，把手工维护的 `UIApplicationSceneManifest` 冲成只有 7 个键的裸 plist → iOS 27 SDK 下无 UIScene 启动即被系统杀死 → 黑屏。与第一个根因（`$(PRODUCT_MODULE_NAME)` 不展开）症状一模一样：**plist 里 UIScene 配置缺失 = iOS 27 黑屏的标准症状，无日志无崩溃**。修复：恢复 plist + project.yml 去掉 `info` 块（只留 `INFOPLIST_FILE` 指向），重建工程后验证列表页正常（截图 `/tmp/foldadapt_xcode_run.png`）。这篇文章里"UIScene 配错=静默黑屏"值得单独写一段，两个根因是同一枚硬币。

**遗留**：① 问题实际方向为 iPhone Duo 折叠屏适配难度，决策卡待作者仲裁后成稿。

**Xcode 27.1 更新后的新事实（2026-10-24 晚）**：① `simctl` 新增 **iPhone Duo 设备类型**（27.0 没有，需 Xcode 27.1 + iOS 27.1 runtime，已下载安装 7.85GB）；② Duo 模拟器是**双屏模型**：外屏 LCD 1398×2034（折叠态）+ 主屏 LCD-1 2007×2853（展开态），`simctl io screenConfig power on/off --display LCD|LCD-1` 可切换，`screenConfig geometry` 可改分辨率；③ `simctl io power on` 可点亮模拟器屏幕（此前黑屏一半是屏幕未通电）；④ Flutter 3.47.8 在 Xcode 27.1 下模拟器构建一把过（30s）；⑤ 模拟器屏幕默认通电状态混乱，曾触发 "system shell probably crashed"，双屏电源操作需谨慎。

合计约 3h45min，卡 4h 预算。若 E 需要现下载 Flutter 3.47（约 1GB），优先砍 F，其次把 D 缩成"只演示 Podfile 一项"。

## 三、时间线检查点

- T+45min：A/B 完成，拿到老版本构建结果 → 若两轮都直接成功，文章第 4 节结论改为"能编但三大隐性缺口"，C 优先级提高。
- T+2h：C 完成（崩溃复现是全文最大素材）。
- T+3h：D、E 完成。
- T+3h30：汇总证据，写知乎初稿（另起文件 `zhihu-...-v1.md`，走 zhihu-answer-drafter 流程）。
