// swift-tools-version:5.7
import PackageDescription
let package = Package(
    name: "Bat-iOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Bat",
            targets: ["Bat"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvBat",
            path: "lib/ios/PvBat.xcframework"
        ),
        .target(
            name: "Bat",
            dependencies: ["PvBat"],
            path: ".",
            exclude: [
                "binding/ios/BatAppTest",
                "demo"
            ],
            sources: [
                "binding/ios/Bat.swift",
                "binding/ios/BatErrors.swift",
                "binding/ios/BatLanguage.swift"
            ],
            resources: [
               .copy("lib/common/bat_params.pv")
            ]
        )
    ]
)
