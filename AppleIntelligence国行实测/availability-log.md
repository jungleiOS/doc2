# 可用性追踪日志

> 每次系统升级或传闻节点后跑一次 `swift run DevDemo availability`，reason 的变化轨迹就是「等待史」素材。

| 日期 | 系统版本 | 结果 | reason | 备注 |
|------|---------|------|--------|------|
| 2026-08-26 | macOS 26.6 (25G72) / Xcode 26.4 | ⏳ unavailable | `deviceNotEligible` | 国行 M3 Max。硬件本身在支持列表内，此 reason 印证限制落在「国行设备」身份上而非硬件能力——等上线后复跑看 reason 是否变化 |
