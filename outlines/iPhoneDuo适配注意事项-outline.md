# 大纲：iPhone Duo 适配难度 = 两张清单（知乎回答）

> 问题：https://www.zhihu.com/question/2097046792970028613
> 配套初稿：`Flutter-iOS27适配/Xcode27构建要求Flutter怎么适配/zhihu-iPhoneDuo适配注意事项-v1.md`
> 立场合规要点：不写「适配了多少/黑边统计」；不写踩坑实录；争议预埋未启用；时效=可打磨（搜索型长尾）

## 开头（3 段内）

1. 直接回答二选一：工作量 + 底层限制都是真的，但都能拆成清单
2. 共同前提（全文的"为什么必须做"）：2027 年 4 月起上传构建必须 iOS 27 SDK（苹果公告 2026-09-09）；iOS 27 起最新 SDK 构建的 App 必须 UIScene 生命周期，否则无法启动（官方迁移指南原文）
3. 引出两张清单：一张给原生，一张给 Flutter

## 清单一：iOS 原生适配注意事项（7 条）

1. **先迁 UIScene，再谈布局**——旧生命周期 App 用 Xcode 27 构建后在 iOS 27 无法启动；这是所有布局工作的前置
2. **布局锚点 = horizontalSizeClass**——折上 compact / 展开 regular；苹果官方 Tech Talk 明确建议用 size class 替代横竖屏判断；内屏 7.6" 2670×1878（约1:√2），外屏 5.4" 1398×2034
3. **双栏用系统语义写**——showDetailViewController 一行两用（compact=push / regular=更新右栏），或 UISplitViewController 自动变形
   - 配图：v4_折叠态_单栏列表.png、v4_折叠态_push详情.png
4. **状态放控件树外**——选中/输入/滚动进独立 store；切换瞬间导航栈拆散重建，状态挂视图实例必丢
5. **safe area 非对称**——官方 Tech Talk 点名；边距全交 safeAreaInsets
6. **换屏 ≠ resize**——外屏→内屏是换屏幕对象，布局刷新挂 trait 变化回调，只靠 viewDidLayoutSubviews 会漏
7. **测试基建自备**——Duo 模拟器 Xcode 27.1 才有；命令行切屏不可靠，折叠切换走 DeviceHub；无真机用 traitOverrides 强制形态调试
   - 配图：v4_展开态_双栏.png（HUD 诚实标注强制 regular）、v4_展开态_双栏选中.png

## 清单二：Flutter 等非原生注意事项（6 条）

1. **构建门槛三件套**——Flutter 3.47+（release notes 写明为 Xcode 27 准备，最低 iOS 15）；deployment target 15.0+；新模板内建 UIScene，老工程跟官方迁移
2. **能构建 ≠ 有折叠感知**——DisplayFeature 官方文档仅 Android 填充；iOS 上零感知（官方 issue #192515）；3.47 解决的是交包合规，不是形态感知
3. **三条路线对比表**——等官方（零成本/时间不可控）/ 纯 Dart 粗判（低/不可靠）/ 自写 Platform Channel 插件（中/需自维护）
4. **自写插件 5 注意点**——读 traitCollection 而非算像素；MethodChannel 查询 + EventChannel 订阅分离且都要走；channel 命名与协议版本化；scene 重建后恢复订阅；fallback 返回 unknown
5. **红线：不碰私有 API**——只走 UIKit 公开接口

## 结尾

- 时间表：现在→2027.4 先补 Flutter 三件套；布局按清单 2-6；感知急则插件、缓则粗判+盯 issue
- 可引用结论句：**原生适配的难点不在写布局，在迁移和测试基建；跨端的难点不在构建合规，在拿不到系统感知**

## 素材与信源

- 配图 4 张（全部 demo 自截图，已平铺问题目录）；信源 7 条全挂官方（公告/迁移指南/Tech Talk×2/官网规格/Flutter release notes/issue #192515/platform channels 文档）
- 明确不用：「八成未适配」统计（问题描述的说法不严谨且无全量出处）；「10.5 适配截图驳回」传闻（无官方原文）；踩坑实录

## 待仲裁判断句（3 条）

1. 形态判断永远读 horizontalSizeClass，不算分辨率
2. 3.47 解决交包合规，不是折叠感知
3. 插件成本在维护不在编写

## 写作纪律

- 段落 ≤150 字；去 AI 味/GEO/成稿打分在 v1 稿完成后走流程
