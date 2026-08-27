// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "DevDemo",
    platforms: [.macOS(.v26)],
    targets: [
        .executableTarget(name: "DevDemo")
    ]
)
