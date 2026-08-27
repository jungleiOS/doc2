# dev-demo：Foundation Models 实测脚手架

国行 Apple 智能上线前后的开发者素材采集工具。SwiftPM 命令行工程，零依赖，直接 `swift run`。

## 用法

```bash
cd dev-demo
swift run DevDemo availability   # 可用性检查
swift run DevDemo chat           # 基础会话（中文 prompt 表现）
swift run DevDemo stream         # 流式输出
swift run DevDemo guided         # @Generable 结构化生成
swift run DevDemo tool           # Tool Calling
swift run DevDemo context        # 上下文窗口超限与降级
swift run DevDemo all            # 全部跑一遍
```

## 素材采集指引

| 时机 | 动作 | 产出素材 |
|------|------|---------|
| 现在（上线前） | 跑 `availability` | `unavailable` 的 reason 原文截图 = 「等待史」素材 |
| 现在 | 跑 `chat / guided / context`（若 available） | 海外版基线数据 |
| 上线当天 | 再跑 `all` | 同一命令前后对比 = 开发者篇最硬的对比图 |
| 上线当天 | `chat` 里第三条「北京天气」 | 观察端侧模型如何拒绝/编造实时信息 |

## 每个命令测什么

- **availability**：`SystemLanguageModel.default.availability`。reason 有三种：`deviceNotEligible`（设备不支持）/ `appleIntelligenceNotEnabled`（没开 Apple 智能）/ `modelNotReady`（模型未下载完），含义不同，原文截图。
- **chat**：中文改写、实时信息拒绝行为。第三条故意问天气——端侧模型没有联网能力，它怎么回答是文章素材。
- **stream**：流式输出，演示增量打印。
- **guided**：`@Generable` 结构化生成，直接产出「购买决策」JSON 式结构——呼应知乎内容的决策结构基因。
- **tool**：Tool Calling 演示。对比「带工具 vs 不带工具」的回答差异，模型是否编造数据一目了然。
- **context**：连续追问压测上下文窗口（约 4096 token），演示超限后的降级策略。

## 注意

- API 以 Xcode 26 SDK 实际为准。WWDC25 公布的接口在正式版可能有微调，编译报错就按报错提示改。
- 若 `swift run` 报权限/沙箱问题，把 `Sources/DevDemo` 拖进一个 Xcode App 工程跑即可，代码不用改。
- 编译要求：macOS 26 SDK + Swift 6.2（Xcode 26 自带）。
