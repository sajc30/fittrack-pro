import SwiftUI
import UIKit

// ── Blueprint Sheet Card ────────────────────────────────────────────
struct SheetCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .background(Color.bpSheet)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .stroke(Color.bpLine, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 2))
    }
}

// ── Blueprint Primary Button ────────────────────────────────────────
struct BPButton: View {
    let title: String
    let action: () -> Void
    var isLoading = false
    var isDisabled = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(Color.bpInk)
                        .scaleEffect(0.8)
                }
                Text(title)
                    .font(.blueprint(12, weight: .semibold))
                    .tracking(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isDisabled ? Color.bpPaper.opacity(0.4) : Color.bpPaper)
            .foregroundStyle(Color.bpInk)
            .clipShape(RoundedRectangle(cornerRadius: 2))
        }
        .disabled(isDisabled || isLoading)
    }
}

// ── Blueprint Outline Button ────────────────────────────────────────
struct BPOutlineButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.blueprint(11, weight: .medium))
                .tracking(2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .foregroundStyle(Color.bpTextSecondary)
                .background(Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(Color.bpLine, lineWidth: 1)
                )
        }
    }
}

// ── Blueprint Text Field ────────────────────────────────────────────
struct BPTextField: View {
    let placeholder: String
    @Binding var text: String
    var isSecure = false
    @FocusState private var focused: Bool

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
            }
        }
        .font(.blueprint(13))
        .foregroundStyle(Color.bpTextPrimary)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.bpSheetInset)
        .overlay(
            RoundedRectangle(cornerRadius: 2)
                .stroke(focused ? Color.bpPaper : Color.bpLine, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 2))
        .focused($focused)
        .autocorrectionDisabled()
        .textInputAutocapitalization(.never)
    }
}

// ── Blueprint Drafting Grid Background ─────────────────────────────
struct DraftingGrid: View {
    var body: some View {
        Canvas { ctx, size in
            let minor: CGFloat = 24
            let major: CGFloat = 120
            var minorPath = Path()
            var majorPath = Path()

            var x: CGFloat = 0
            while x <= size.width {
                let isMajor = (x / minor).truncatingRemainder(dividingBy: 5) == 0
                if isMajor {
                    majorPath.move(to: CGPoint(x: x, y: 0))
                    majorPath.addLine(to: CGPoint(x: x, y: size.height))
                } else {
                    minorPath.move(to: CGPoint(x: x, y: 0))
                    minorPath.addLine(to: CGPoint(x: x, y: size.height))
                }
                x += minor
            }
            var y: CGFloat = 0
            while y <= size.height {
                let isMajor = (y / minor).truncatingRemainder(dividingBy: 5) == 0
                if isMajor {
                    majorPath.move(to: CGPoint(x: 0, y: y))
                    majorPath.addLine(to: CGPoint(x: size.width, y: y))
                } else {
                    minorPath.move(to: CGPoint(x: 0, y: y))
                    minorPath.addLine(to: CGPoint(x: size.width, y: y))
                }
                y += minor
            }

            ctx.stroke(minorPath, with: .color(Color.bpLine.opacity(0.5)), lineWidth: 0.5)
            ctx.stroke(majorPath, with: .color(Color.bpLine.opacity(0.9)), lineWidth: 0.5)
            _ = major // suppress warning
        }
    }
}

// ── Section Header (fig-label + title rule) ─────────────────────────
struct SectionHeader: View {
    let fig: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(fig)
                .figLabel(size: 10)
            Divider()
                .background(Color.bpLine)
        }
    }
}

// ── Filter Chip ──────────────────────────────────────────────────────
struct BPChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.blueprint(10, weight: .medium))
                .tracking(1.5)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(isActive ? Color.bpPaper : Color.clear)
                .foregroundStyle(isActive ? Color.bpInk : Color.bpTextSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(isActive ? Color.bpPaper : Color.bpLine, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 2))
        }
    }
}

// ── Stamp (red revision markup) ─────────────────────────────────────
struct Stamp: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.blueprint(9, weight: .bold))
            .tracking(2)
            .foregroundStyle(Color.bpRedline)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .stroke(Color.bpRedline.opacity(0.7), lineWidth: 1.5)
            )
            .rotationEffect(.degrees(-12))
    }
}

// ── Keyboard dismissal ───────────────────────────────────────────────
// .decimalPad / .numberPad have no Return key, so without this a numeric
// field's keyboard has no way to close once it's up.
extension View {
    func dismissesKeyboardOnTap() -> some View {
        simultaneousGesture(
            TapGesture().onEnded {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        )
    }
}
