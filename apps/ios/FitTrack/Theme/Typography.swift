import SwiftUI

// Blueprint typography helpers
extension Font {
    /// IBM Plex Mono / SF Mono fallback for annotations and data labels
    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("IBMPlexMono-Regular", size: size).weight(weight)
    }

    static func monoMedium(_ size: CGFloat) -> Font {
        .custom("IBMPlexMono-Medium", size: size)
    }

    static func monoBold(_ size: CGFloat) -> Font {
        .custom("IBMPlexMono-Bold", size: size)
    }

    /// Falls back to SF Mono if IBM Plex Mono is not embedded
    static func blueprint(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font.system(size: size, weight: weight, design: .monospaced)
    }
}

// Convenience view modifier for blueprint label style
struct FigLabel: ViewModifier {
    let size: CGFloat

    func body(content: Content) -> some View {
        content
            .font(.blueprint(size, weight: .medium))
            .foregroundStyle(Color.bpTextSecondary)
            .tracking(1.5)
            .textCase(.uppercase)
    }
}

extension View {
    func figLabel(size: CGFloat = 10) -> some View {
        modifier(FigLabel(size: size))
    }
}
