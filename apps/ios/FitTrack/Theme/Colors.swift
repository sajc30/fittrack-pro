import SwiftUI

// Blueprint design system — mirrors the web CSS token set
extension Color {
    // Surfaces
    static let bpInk        = Color(hex: "#0A1320")   // deepest background
    static let bpSheet      = Color(hex: "#0F1C2E")   // card surface
    static let bpSheetRaised = Color(hex: "#152236")  // elevated card
    static let bpSheetInset  = Color(hex: "#081018")  // recessed inset

    // Lines
    static let bpLine       = Color(hex: "#1E3048")   // hairline rule
    static let bpLineBright = Color(hex: "#2A4560")   // bright rule

    // Text
    static let bpPaper      = Color(hex: "#8FB4D9")   // primary / active blue
    static let bpTextPrimary   = Color(hex: "#C8DDF0")
    static let bpTextSecondary = Color(hex: "#6B8FAD")
    static let bpTextGhost     = Color(hex: "#3A5570")

    // Accent
    static let bpRedline    = Color(hex: "#C8392B")   // revision red

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int & 0xFF)         / 255
        self.init(red: r, green: g, blue: b)
    }
}
