import FoundationModels

/// 可用性检查：国行上线前大概率走 unavailable 分支。
/// 素材动作：上线前后各跑一次，reason 原文截图存档 —— 这就是「前后对比」的硬素材。
func checkAvailability() async {
    print("=== SystemLanguageModel 可用性检查 ===")
    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
        print("✅ available —— 端侧模型可用，开始采集素材")
    case .unavailable(let reason):
        print("⏳ unavailable")
        print("reason: \(String(describing: reason))")
    }
    print()
}
