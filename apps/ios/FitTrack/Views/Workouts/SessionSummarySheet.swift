import SwiftUI

/// What the session came to, shown once on closing out.
///
/// Mirrors the web's session-summary.tsx. Every number here is already known
/// the moment the last set is logged — the value is in stating it plainly at
/// the one moment the user is looking for a verdict on the session.
struct SessionSummaryData: Identifiable {
    let id = UUID()
    let name: String
    let duration: TimeInterval
    let sets: Int
    let reps: Int
    /// Already converted to display units.
    let volume: Double
    let prs: Int
    let muscleGroups: [String]
}

struct SessionSummarySheet: View {
    let data: SessionSummaryData
    let unitLabel: String
    let onDone: () -> Void

    private var durationText: String {
        let total = Int(data.duration)
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0
            ? String(format: "%d:%02d:%02d", h, m, s)
            : String(format: "%02d:%02d", m, s)
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.35)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("SHEET FILED").figLabel(size: 10)
                        Text(data.name)
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(Color.bpTextPrimary)
                    }

                    SheetCard {
                        HStack(spacing: 0) {
                            StatCell(label: "DURATION", value: durationText)
                            Divider().frame(height: 32).background(Color.bpLine)
                            StatCell(label: "SETS", value: "\(data.sets)")
                            Divider().frame(height: 32).background(Color.bpLine)
                            StatCell(label: "REPS", value: "\(data.reps)")
                        }
                        .padding(18)
                    }

                    SheetCard {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("TOTAL LOAD MOVED").figLabel(size: 9)
                            Text("\(Int(data.volume.rounded())) \(unitLabel.lowercased())")
                                .font(.blueprint(24, weight: .semibold))
                                .foregroundStyle(Color.bpTextPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(18)
                    }

                    if data.prs > 0 {
                        HStack(spacing: 8) {
                            Image(systemName: "trophy")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.bpRedline)
                            Text("\(data.prs) NEW RECORD\(data.prs > 1 ? "S" : "")")
                                .font(.blueprint(12, weight: .semibold))
                                .tracking(1)
                                .foregroundStyle(Color.bpRedline)
                            Spacer()
                        }
                        .padding(.horizontal, 14).padding(.vertical, 12)
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline, lineWidth: 1))
                    }

                    if !data.muscleGroups.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("WORKED").figLabel(size: 9)
                            FlowRow(items: data.muscleGroups) { m in
                                Text(m.replacingOccurrences(of: "_", with: " ").uppercased())
                                    .font(.blueprint(10))
                                    .tracking(1)
                                    .foregroundStyle(Color.bpTextSecondary)
                                    .padding(.horizontal, 8).padding(.vertical, 5)
                                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                            }
                        }
                    }

                    BPButton(title: "DONE", action: onDone)
                        .padding(.top, 4)
                }
                .padding(20)
            }
        }
    }
}

/// Minimal wrapping row — the muscle-group chips need to wrap on a narrow
/// screen, and SwiftUI has no built-in flow layout before iOS 16's Layout API
/// is worth the ceremony for one use.
private struct FlowRow<Item: Hashable, Content: View>: View {
    let items: [Item]
    @ViewBuilder let content: (Item) -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(chunks.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 6) {
                    ForEach(row, id: \.self) { content($0) }
                    Spacer(minLength: 0)
                }
            }
        }
    }

    /// Three per row fits comfortably at 402pt with the labels we use.
    private var chunks: [[Item]] {
        stride(from: 0, to: items.count, by: 3).map {
            Array(items[$0..<min($0 + 3, items.count)])
        }
    }
}
