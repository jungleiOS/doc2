import Foundation

// 国行 Apple 智能 Foundation Models 实测脚手架
// 用法：swift run DevDemo <command>
//   availability  可用性检查（上线前后各跑一次，截图存档 = 前后对比素材）
//   chat          基础会话（中文 prompt 表现）
//   stream        流式输出
//   guided        @Generable 结构化生成
//   tool          Tool Calling
//   context       上下文窗口超限与降级
//   all           全部跑一遍

let args = CommandLine.arguments
let command = args.count > 1 ? args[1] : "all"

do {
    switch command {
    case "availability":
        await checkAvailability()
    case "chat":
        try await runBasicChat()
    case "stream":
        try await runStreaming()
    case "guided":
        try await runGuidedGeneration()
    case "tool":
        try await runToolCalling()
    case "context":
        try await runContextLimit()
    case "all":
        await checkAvailability()
        try await runBasicChat()
        try await runStreaming()
        try await runGuidedGeneration()
        try await runToolCalling()
        try await runContextLimit()
    default:
        print("未知命令: \(command)，可用：availability / chat / stream / guided / tool / context / all")
    }
} catch {
    print("❌ 执行失败: \(error)")
}
