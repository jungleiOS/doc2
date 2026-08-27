import Foundation
import FoundationModels

// MARK: - 基础会话：中文 prompt 表现

func runBasicChat() async throws {
    print("=== 基础会话（中文） ===")
    let session = LanguageModelSession(instructions: "你是一个中文助手，回答简洁、准确。")
    let prompts = [
        "用三句话向一个普通用户解释什么是端侧大模型。",
        "把「这个充电器支持一百瓦快充但是多口同时用会分流」改写成一句适合商品详情页的话。",
        "北京今天天气怎么样？",  // 故意问实时信息：端侧模型无联网能力，观察它如何拒绝/编造
    ]
    for prompt in prompts {
        print("Q: \(prompt)")
        let response = try await session.respond(to: prompt)
        print("A: \(response.content)")
        print("---")
    }
    print()
}

// MARK: - 流式输出

func runStreaming() async throws {
    print("=== 流式输出 ===")
    let session = LanguageModelSession()
    let stream = session.streamResponse(to: "写一段 100 字左右的充电宝登机规定说明。")
    var lastLength = 0
    for try await partial in stream {
        // partial 是累积快照，演示时只打印增量部分
        let text = String(describing: partial)
        if text.count > lastLength {
            print(text.dropFirst(lastLength), terminator: "")
            lastLength = text.count
        }
    }
    print("\n")
}

// MARK: - @Generable 结构化生成

@Generable
struct PurchaseAdvice {
    @Guide(description: "一句话结论：买还是不买")
    var verdict: String

    @Guide(description: "适合购买的人群，最多 3 条")
    var suitableFor: [String]

    @Guide(description: "主要缺点，最多 3 条")
    var drawbacks: [String]
}

func runGuidedGeneration() async throws {
    print("=== @Generable 结构化生成 ===")
    let session = LanguageModelSession()
    let advice = try await session.respond(
        to: "iPhone 15 用户，预算有限，现在值不值得换 iPhone 17？",
        generating: PurchaseAdvice.self
    )
    print("结论: \(advice.content.verdict)")
    print("适合: \(advice.content.suitableFor.joined(separator: "；"))")
    print("缺点: \(advice.content.drawbacks.joined(separator: "；"))")
    print()
}

// MARK: - Tool Calling

struct BatteryHealthTool: Tool {
    let name = "getBatteryHealth"
    let description = "查询设备电池健康度（演示用，返回模拟数据）"

    @Generable
    struct Arguments {
        @Guide(description: "设备名称，例如 iPhone 15 Pro")
        var device: String
    }

    func call(arguments: Arguments) async throws -> String {
        // 演示工具：真实场景这里读系统 API 或数据库
        return "\(arguments.device) 电池健康度 87%，循环次数 412"
    }
}

func runToolCalling() async throws {
    print("=== Tool Calling ===")
    let session = LanguageModelSession(
        tools: [BatteryHealthTool()],
        instructions: "回答设备相关问题时，优先调用工具获取真实数据，不要编造。"
    )
    let response = try await session.respond(to: "我的 iPhone 15 Pro 电池还能撑多久？")
    print("A: \(response.content)")
    print("提示：对比「不带工具直接问」的回答，模型是否编造数据 —— 这就是文章素材。")
    print()
}

// MARK: - 上下文窗口超限与降级

func runContextLimit() async throws {
    print("=== 上下文窗口压力测试 ===")
    let session = LanguageModelSession()
    // 端侧模型上下文约 4096 token，连续追问直到超限，记录撑到第几轮
    var round = 0
    do {
        for i in 1...50 {
            let filler = String(repeating: "充电宝选购要考虑容量、功率、协议、3C 认证。", count: 20)
            _ = try await session.respond(to: "第 \(i) 轮：\(filler) 总结一下。")
            round = i
        }
        print("50 轮未触发超限，上下文比预期大")
    } catch LanguageModelSession.GenerationError.exceededContextWindowSize {
        print("⚠️ 第 \(round + 1) 轮触发 exceededContextWindowSize")
        print("降级策略演示：丢弃早期对话，开新 session 续上。")
        let fresh = LanguageModelSession(instructions: "之前的对话已超出上下文，我们从这里继续。")
        let response = try await fresh.respond(to: "一句话总结：充电宝选购的四个要点。")
        print("降级后 A: \(response.content)")
    }
    print()
}
