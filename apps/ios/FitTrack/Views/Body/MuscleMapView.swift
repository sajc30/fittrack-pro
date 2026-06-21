import SwiftUI

// ── Muscle group → MuscleMapJS slug(s) ──────────────────────────────────────
// Slug names match the web (MG_FRONT/MG_BACK in muscle-map.tsx)

private let MG_FRONT: [String: [String]] = [
    "chest":      ["chest"],
    "shoulders":  ["deltoids"],
    "biceps":     ["biceps"],
    "forearms":   ["forearm"],
    "core":       ["abs", "obliques"],
    "quadriceps": ["quadriceps"],
    "calves":     ["calves"],
    "full_body":  ["chest","deltoids","biceps","forearm","abs","obliques","quadriceps","calves"],
]

private let MG_BACK: [String: [String]] = [
    "back":       ["upper-back", "lower-back"],
    "shoulders":  ["deltoids", "trapezius"],
    "triceps":    ["triceps"],
    "forearms":   ["forearm"],
    "hamstrings": ["hamstring"],
    "glutes":     ["gluteal"],
    "calves":     ["calves"],
    "full_body":  ["upper-back","lower-back","deltoids","trapezius","triceps","gluteal","hamstring","calves"],
]

// ── Helpers ─────────────────────────────────────────────────────────────────

private func regionSetsMap(
    _ mapping: [String: [String]],
    perMuscle: [String: Int]
) -> [String: Int] {
    var out: [String: Int] = [:]
    for (mg, slugs) in mapping {
        let n = perMuscle[mg] ?? 0
        for slug in slugs { out[slug] = max(out[slug] ?? 0, n) }
    }
    return out
}

// Parses an SVG path string (M/L/C/Z absolute commands) into a SwiftUI Path.
// All paths in BODY_* are pre-converted from arcs to cubics — no A command needed.
private func pathFromSVG(_ d: String, offset: CGPoint, scale: CGFloat) -> Path {
    var path = Path()
    let spaced = d.replacingOccurrences(of: "([MLCZmlcz])", with: " $1 ", options: .regularExpression)
    let raw = spaced.replacingOccurrences(of: ",", with: " ")
    var tokens: [String] = []
    var cur = ""
    for ch in raw {
        if ch.isWhitespace {
            if !cur.isEmpty { tokens.append(cur); cur = "" }
        } else {
            cur.append(ch)
        }
    }
    if !cur.isEmpty { tokens.append(cur) }

    var i = 0

    func pt(_ x: Double, _ y: Double) -> CGPoint {
        CGPoint(x: CGFloat(x) * scale + offset.x, y: CGFloat(y) * scale + offset.y)
    }
    func next() -> Double {
        guard i < tokens.count else { return 0 }
        let v = Double(tokens[i]) ?? 0; i += 1; return v
    }

    while i < tokens.count {
        let cmd = tokens[i]; i += 1
        switch cmd {
        case "M": path.move(to: pt(next(), next()))
        case "L": path.addLine(to: pt(next(), next()))
        case "C":
            let cp1x = next(), cp1y = next()
            let cp2x = next(), cp2y = next()
            let ex   = next(), ey   = next()
            path.addCurve(to: pt(ex, ey), control1: pt(cp1x, cp1y), control2: pt(cp2x, cp2y))
        case "Z": path.closeSubpath()
        default:  break
        }
    }
    return path
}

private func hatchSpacing(sets: Int) -> CGFloat {
    switch sets {
    case 1...2: return 7
    case 3...4: return 5
    case 5...7: return 3.5
    default:    return 2.5
    }
}

private func hatchOpacity(sets: Int) -> Double {
    switch sets {
    case 1...2: return 0.35
    case 3...4: return 0.55
    case 5...7: return 0.75
    default:    return 0.92
    }
}

// ── Canvas renderer ─────────────────────────────────────────────────────────

private struct BodyMapCanvas: View {
    let frontPaths: [String: [String]]
    let backPaths:  [String: [String]]
    let frontSets:  [String: Int]
    let backSets:   [String: Int]

    var body: some View {
        Canvas { ctx, size in
            let scale    = size.width / 280
            let frontOff = CGPoint(x: 4 * scale,   y: 4 * scale)
            let backOff  = CGPoint(x: 152 * scale,  y: 4 * scale)

            // Pass 1 — silhouette (all slugs, dim outline)
            // Pass 2 — active slugs with hatching on top
            func drawRegions(_ paths: [String: [String]], _ rSets: [String: Int], _ off: CGPoint) {
                // Pass 1: silhouette
                for (_, svgPaths) in paths {
                    var combined = Path()
                    for svgPath in svgPaths {
                        combined.addPath(pathFromSVG(svgPath, offset: off, scale: scale))
                    }
                    ctx.stroke(combined, with: .color(Color.bpLineBright.opacity(0.6)), lineWidth: 0.5 * scale)
                }
                // Pass 2: active hatch + bright stroke on top
                for (slug, svgPaths) in paths {
                    let sets = rSets[slug] ?? 0
                    guard sets > 0 else { continue }
                    var combined = Path()
                    for svgPath in svgPaths {
                        combined.addPath(pathFromSVG(svgPath, offset: off, scale: scale))
                    }
                    var clipped = ctx
                    clipped.clip(to: combined)
                    let spacing = hatchSpacing(sets: sets) * scale
                    let opacity = hatchOpacity(sets: sets)
                    var x: CGFloat = -size.height
                    while x < size.width + size.height {
                        var line = Path()
                        line.move(to: CGPoint(x: x, y: 0))
                        line.addLine(to: CGPoint(x: x + size.height, y: size.height))
                        clipped.stroke(line, with: .color(Color.bpPaper.opacity(opacity)), lineWidth: scale * 1.2)
                        x += spacing
                    }
                    ctx.stroke(combined, with: .color(Color.bpPaper.opacity(0.85)), lineWidth: 0.85 * scale)
                }
            }

            drawRegions(frontPaths, frontSets, frontOff)
            drawRegions(backPaths,  backSets,  backOff)

            // Center divider
            var div = Path()
            div.move(to: CGPoint(x: 140 * scale, y: 4 * scale))
            div.addLine(to: CGPoint(x: 140 * scale, y: (4 + 272) * scale))
            ctx.stroke(div, with: .color(Color.bpLine.opacity(0.4)),
                       style: StrokeStyle(lineWidth: 0.5 * scale, dash: [3 * scale, 3 * scale]))

            // FRONT / BACK labels
            for (label, xPos) in [("FRONT", 60.0), ("BACK", 200.0)] {
                let attrs = AttributeContainer
                    .font(.system(size: 8 * scale, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.bpTextGhost)
                ctx.draw(
                    Text(label).font(.system(size: 8 * scale, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.bpTextGhost),
                    at: CGPoint(x: CGFloat(xPos) * scale, y: 278 * scale),
                    anchor: .center
                )
                _ = attrs
            }
        }
    }
}

// ── Legend ──────────────────────────────────────────────────────────────────

private let LEGEND_ITEMS: [(key: String, label: String)] = [
    ("chest",      "CHEST"),
    ("back",       "BACK"),
    ("shoulders",  "DELTS"),
    ("biceps",     "BICEPS"),
    ("triceps",    "TRICEPS"),
    ("core",       "CORE"),
    ("quadriceps", "QUADS"),
    ("hamstrings", "HAMS"),
    ("glutes",     "GLUTES"),
    ("calves",     "CALVES"),
    ("forearms",   "FOREARMS"),
]

// ── Main view ───────────────────────────────────────────────────────────────

struct MuscleMapView: View {
    let setsPerMuscle: [String: Int]

    @Environment(ProfileViewModel.self) private var profileVM

    private var gender: String {
        profileVM.profile?.gender ?? "male"
    }

    private var frontPaths: [String: [String]] { gender == "female" ? BODY_FRONT_F : BODY_FRONT_M }
    private var backPaths:  [String: [String]] { gender == "female" ? BODY_BACK_F  : BODY_BACK_M  }
    private var frontSets:  [String: Int]    { regionSetsMap(MG_FRONT, perMuscle: setsPerMuscle) }
    private var backSets:   [String: Int]    { regionSetsMap(MG_BACK,  perMuscle: setsPerMuscle) }

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 12) {
                header
                Divider().background(Color.bpLine)
                BodyMapCanvas(
                    frontPaths: frontPaths, backPaths: backPaths,
                    frontSets: frontSets,   backSets:  backSets
                )
                .aspectRatio(280 / 284, contentMode: .fit)
                .frame(maxWidth: .infinity)
                Divider().background(Color.bpLine)
                legend
            }
            .padding(18)
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text("MUSCLE ACTIVITY MAP").figLabel(size: 10)
                    Text(gender == "male" ? "♂ M" : "♀ F")
                        .font(.blueprint(8))
                        .foregroundStyle(Color.bpTextSecondary)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .overlay(RoundedRectangle(cornerRadius: 2)
                            .stroke(Color.bpLine, lineWidth: 0.75))
                }
                Text("SETS PER GROUP · PAST 7 DAYS")
                    .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
            }
            Spacer()
            intensityKey
        }
    }

    private var intensityKey: some View {
        HStack(spacing: 10) {
            ForEach([
                ("0 SETS", false),
                ("1–2",    true),
                ("3–4",    true),
                ("5–7",    true),
                ("8+",     true),
            ], id: \.0) { label, hatched in
                VStack(spacing: 3) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 1)
                            .stroke(Color.bpLineBright, lineWidth: 0.5)
                            .frame(width: 14, height: 14)
                        if hatched {
                            Canvas { ctx, size in
                                let spacing: CGFloat = label == "1–2" ? 4 : label == "3–4" ? 3 : label == "5–7" ? 2 : 1.5
                                let opacity: Double  = label == "1–2" ? 0.35 : label == "3–4" ? 0.55 : label == "5–7" ? 0.75 : 0.92
                                var x: CGFloat = -size.height
                                while x < size.width + size.height {
                                    var line = Path()
                                    line.move(to: CGPoint(x: x, y: 0))
                                    line.addLine(to: CGPoint(x: x + size.height, y: size.height))
                                    ctx.stroke(line, with: .color(Color.bpPaper.opacity(opacity)), lineWidth: 1)
                                    x += spacing
                                }
                            }
                            .frame(width: 14, height: 14)
                            .clipShape(RoundedRectangle(cornerRadius: 1))
                        }
                    }
                    Text(label)
                        .font(.blueprint(7))
                        .foregroundStyle(Color.bpTextGhost)
                        .fixedSize()
                }
            }
        }
    }

    private var legend: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4),
            spacing: 6
        ) {
            ForEach(LEGEND_ITEMS, id: \.key) { item in
                let sets = setsPerMuscle[item.key] ?? 0
                HStack(spacing: 3) {
                    Text(item.label)
                        .font(.blueprint(8))
                        .foregroundStyle(sets > 0 ? Color.bpTextPrimary : Color.bpTextGhost)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if sets > 0 {
                        Text("\(sets)")
                            .font(.blueprint(8))
                            .foregroundStyle(Color.bpTextSecondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 6).padding(.vertical, 3)
                .overlay(RoundedRectangle(cornerRadius: 2)
                    .stroke(sets > 0 ? Color.bpLineBright : Color.bpLine, lineWidth: 0.75))
                .opacity(sets == 0 ? 0.35 : 1)
            }
        }
    }
}
