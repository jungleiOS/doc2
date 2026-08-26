先说结论，**C 口当然可以供电，你的 67W 头硬件上完全没问题**。乞丐版 14 寸 M3 原配就是 70W USB-C 电源适配器，67W 和它只差 3W，本质同一档。你看到的「有电源但没在充电」，**99% 不是头的问题，是 macOS 的电池管理策略在暂停充电**。

![Apple 官方 70W USB-C 电源适配器，即 14 英寸 M3 机型包装内原配头（图源：Apple Store）](cover-assets/raw/MacBookM3供电/apple-70w-adapter-store.png)

苹果官方对这台机器的规格写得很清楚，14 英寸 M3 机型包装里配的是 70W USB-C 电源适配器加 MagSafe 3 线，同时 C 口也支持 PD 供电；想要快充到 50% 只要 30 分钟，需要 96W 或更高功率的 USB-C 电源适配器。[Apple 技术规格](https://support.apple.com/en-asia/117735)

![Apple 技术规格页 Battery and Power 部分，明确列出 70W USB-C Power Adapter 与 Fast-charge capable with 96W USB-C Power Adapter（图源：Apple 技术规格）](cover-assets/raw/MacBookM3供电/apple-spec-mbp14-m3-power.png)

为什么 67W 头会显示「有电源但没在充电」？

macOS 默认会学习你的使用习惯，夜间或长时间插电时把电池充到 80% 左右就停下来，之后直接用适配器给整机供电。这个时候电池图标可能显示「电源已接通，未充电」或者电量停在 80% 不动。这不是充不进去，是系统判断你暂时不需要满电，替你保护电池寿命。苹果的支持文档里也专门列过这种「Not Charging」状态，属于正常设计。[Apple 支持文档](https://support.apple.com/guide/macbook-pro/charge-the-battery-apdbc13fd966/mac)

![macOS 菜单栏电池状态真实截图，显示 Power Source: Power Adapter / Charging On Hold (Rarely Used On Battery)，点 Charge to Full Now 即可继续充（图源：macReports）](cover-assets/raw/MacBookM3供电/macreports-charge-to-full.png)

想验证也很简单。按住电池图标点「立即充满」或者进系统设置 → 电池 → 把「优化电池充电」「80% 上限」临时关掉，它马上就会继续往 100% 走。如果关掉之后还是不充电，那才是头或线的问题。

那瓦数到底怎么选？

- 只想要一个能正常供电、慢慢充满的头，67W 够用，和原配 70W 体验几乎没区别。
- 想边重度使用边快充，或者 30 分钟回血 50%，就得上 96W 或 100W 头。
- 出差想一个头充手机和电脑，65W/67W 多口氮化镓最省地方；手机分走 20W，剩下的 45W 给 MacBook 日常办公也够了，就是充电会变慢。

再说一下线。67W 头的 PDO 是 20.3V/3.3A，只要你的 C-to-C 线能过 3A 就不会被线卡住。但市面上很多便宜线只标 3A 且没有 E-Marker 芯片，长期高功率用不够稳。如果打算长期用 C 口充 MacBook，建议买 5A EPR 线，功率余量更大，发热也更低。

一个小提醒，C 口供电在功能上完全没问题，但它不像 MagSafe 3 那样带磁吸防绊。出差在酒店或机场被线绊到，C 口是会把整机带下桌的，MagSafe 3 只会断开。所以我的习惯是，出门带一个多口氮化镓 + C 线应付所有设备，回酒店固定办公时换回 MagSafe 3。

![Apple 官方 USB-C 转 MagSafe 3 连接线，磁吸设计能在被绊时自动断开，保护整机（图源：Apple Store）](cover-assets/raw/MacBookM3供电/apple-magsafe3-cable.png)

---

「头有瓦数没用，得看手机/电脑要不要」这套握手逻辑，我在协议篇里写过，[为什么 100W 充电器给 iPhone 充电只有 5W？充电协议一篇讲透](https://zhuanlan.zhihu.com/p/2073203760332026596)。想看多口充电器怎么买不踩坑，主文在这里，[多口充电器选购指南：为什么看了总瓦数就下单的人，大多都后悔了](https://zhuanlan.zhihu.com/p/2070624966568064377)
