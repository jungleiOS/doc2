# iPhone Duo 的人脸解锁，和 3D 解锁的区别大吗？

先说结论：**大在安全等级，不在解锁速度。**

题目里说的 3D 解锁，就是 Face ID 那套。这次 iPhone Duo 加的是 2D 人脸识别，用的就是那颗普通前置摄像头，不是 Face ID 的原深感镜头（往脸上打红外光点测深度的那一套）。

![iPhone Duo 合盖外屏官方图（图源：苹果官网）](https://i.imgs.ovh/2026/11/17/9401fd74573d372f3782ee6b73542df9.jpg)

## 2D 和 3D，差的到底是什么

**2D 人脸识别看的是一张平面的照片，3D 结构光认的是一张立体的脸。**

Face ID 会往你脸上投射三万多个看不见的红外光点，读回来一张带深度的「石膏像」。<!-- 判断句 -->平面照片骗得过 2D，骗不过 3D——这是两者安全等级差的物理根源，不是软件调校能弥补的。

而 iPhone Duo 外屏上只有一颗普通前置摄像头（拆解已确认是索尼 IMX915）。识别原理上，它和安卓机的人脸解锁是同一类 2D 方案；区别不在识别本身，在苹果不让它碰安全要求高的场景。

## 但速度上，它真的够用

爱范儿实测：光线充足时解锁不到半秒，体感跟 Face ID 基本打平；全黑环境下靠屏幕亮度补光，也有机会解开（[凤凰网科技转发的实测报道](https://tech.ifeng.com/c/8y7Qq9s3E64)）。

![录入人脸实测画面（图源：9to5Mac）](https://i.imgs.ovh/2026/11/17/f066cd534ff61502060000df1994df5e.jpg)

这也解释了苹果为什么敢在这个时间点推它。<!-- 判断句 -->体验短板本来就不在识别速度，而在「每次合盖看外屏都得摸一下电源键」——这个功能要解决的只是这一下。

## 苹果划定的使用范围

把目前扒出来的限制条款摆在一起，这份清单基本回答了这个问题的大半：

- **默认关闭**，要在 设置 → 触控 ID 与密码 里手动开启，录入时按提示转动头部采集多个角度
- **只在合盖状态下、只在锁屏界面可用**，展开手机照样用别的解锁方式
- Apple Pay、查看已存密码、应用内购买、任何需要生物识别的场景，**全部回退到 Touch ID 或密码**
- 手机闲置约 45 分钟没解锁过，人脸识别临时失效，必须重新按指纹或输密码

注意一个细节：开启这项功能的前提是**先用 Touch ID 或密码证明一次你是谁**。<!-- 判断句 -->所以它没打算替代 Touch ID——它只在指纹验证之后的一段时间内生效，相当于给 Touch ID 延长使用期。苹果的安全模型是：指纹或密码才是本，人脸解锁只是你刚证明过身份之后的便捷出口。

45 分钟这个数，目前只出现在公开测试版（Beta）里，是不是最终值要等正式版。<!-- 判断句 -->这类限制条款在测试期历来会调，45 分钟更像个待打磨的占位数字，不是算出来的安全阈值。

## 为什么 Duo 死活不上真 Face ID

这是这个问题真正有意思的一层。iPhone Duo 缺的从来不是「一个地方」放深感镜头，而是一台机器有两种形态，生物识别的方案就得跟着翻倍，或者干脆降一档。

直板 iPhone 的 Face ID 传感器集中在顶部那一小块刘海/灵动岛区域，一套就够用。<!-- 判断句 -->Duo 合盖有外屏、展开有内屏，两个状态都要解锁：要么两块屏各塞一套 TrueDepth，成本和结构都吃不消——内屏那一套还得做成屏下（把镜头藏在屏幕底下，目前良率很差）；要么像现在这样，侧边指纹放在电源键上两个状态共用，再用 2D 人脸补合盖时的便捷性。

![2D 与 3D 人脸识别原理对比（自制示意图）](https://i.imgs.ovh/2026/11/17/483ba2e35fb728ccc5edac3377fd4819.png)

彭博的 Gurman 也确认过：Duo 内屏那颗屏下镜头只是 FaceTime 摄像头，不含 TrueDepth 深感硬件。Duo 是 iPhone SE 3 之后第一台用回 Touch ID 的新 iPhone——网上有人说这是开倒车，但折叠形态下，这目前是最优解。<!-- 判断句 -->

顺带一提，据 gHacks 和 WIRED 报道，这次的人脸识别技术借自苹果自家的 HomeView 智能屏——那类设备本来就用摄像头识别人脸，属于现有技术的复用，不是新造了一套系统。

![苹果 HomeView 智能屏官方产品图（图源：苹果官网）](https://i.imgs.ovh/2026/11/17/8346bc6f56eb31beef1e702f29f6a33a.jpg)

## 真正的 Face ID，还得等

彭博报道苹果已经在测试给第二代 iPhone Duo 的外屏加 Face ID 的原型机，但还没定能不能赶上；WIRED 的说法更保守：排期紧，可能要等到 2028 年的第三代。

这项功能值得开，白得的便捷。但有两个预期要先校准：发现 Apple Pay 要你按指纹，不是识别失灵，是它本来就这样设计的；<!-- 判断句 -->把它当「合盖时少按一次电源键」来用，它就会让你满意——指望它干 Face ID 的活，它从一开始就没答应。

---

_事实信源：[MacRumors 11 月 16 日报道](https://www.macrumors.com/2026/11/16/iphone-duo-face-unlock/)、[9to5Mac 功能细节](https://9to5mac.com/2026/11/16/ios-27-3-adds-new-face-unlock-feature-for-iphone-duo/)、[TechCrunch 报道](https://techcrunch.com/2026/11/16/apple-adds-face-unlock-to-the-iphone-duo-but-its-not-face-id/)、[Quartz 快讯](https://qz.com/apple-iphone-duo-face-unlock-ios-beta-111626)、[gHacks 技术解读](https://www.ghacks.net/2026/11/17/ios-27-3-beta-brings-face-unlock-to-the-iphone-duo-but-it-cannot-approve-apple-pay/)、[WIRED](https://www.wired.com/story/iphone-duo-is-getting-a-limited-version-of-face-id/)、[爱范儿实测](https://tech.ifeng.com/c/8y7Qq9s3E64)、[快科技](https://news.mydrivers.com/1/1160/1160502.htm)、[爱范儿 iPhone Duo 拆机](https://www.ifanr.com/1685935)、[苹果官方 Newsroom（Face ID 三万个光点）](https://www.apple.com/newsroom/2017/09/the-future-is-here-iphone-x/)。45 分钟限制目前仅见于 Beta 版，以正式版为准。我之前写过 iPhone Duo 的良率、开售即跌破官方价和黄牛分析，对这台机器的判断可以串着看。_

<!-- 图片溯源映射（发布前删除本段）
苹果折叠屏/iPhoneDuo人脸解锁/配图-iPhoneDuo合盖外屏官方图.jpg -> https://i.imgs.ovh/2026/11/17/9401fd74573d372f3782ee6b73542df9.jpg
苹果折叠屏/iPhoneDuo人脸解锁/配图-录入人脸实测9to5Mac.jpg -> https://i.imgs.ovh/2026/11/17/f066cd534ff61502060000df1994df5e.jpg
苹果折叠屏/iPhoneDuo人脸解锁/配图-2D与3D人脸识别对比.png -> https://i.imgs.ovh/2026/11/17/483ba2e35fb728ccc5edac3377fd4819.png
苹果折叠屏/iPhoneDuo人脸解锁/配图-HomeView官方产品图.jpg -> https://i.imgs.ovh/2026/11/17/8346bc6f56eb31beef1e702f29f6a33a.jpg
重传命令：node .agents/skills/image-host-upload/upload.js --force "苹果折叠屏/iPhoneDuo人脸解锁/zhihu-iPhoneDuo人脸解锁-v1.md"
-->
