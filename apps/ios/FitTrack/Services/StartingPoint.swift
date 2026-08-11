import Foundation

/// Where to start on a movement you've never logged.
///
/// Hand port of packages/shared/src/suggestion.ts — iOS can't import that
/// package, so the two must be kept behaviourally identical by hand. Any change
/// here needs the same change there, and vice versa.
///
/// Deliberately conservative and deliberately not a single number: being wrong
/// costs a failed rep under a loaded bar, so the output leads with the user's
/// own comparable lifts and offers a range underneath.
enum StartingPoint {

    /// An exercise the user has trained, with their best working set on it.
    struct Candidate: Identifiable, Hashable {
        let id: UUID
        let name: String
        let equipment: String
        /// Nil when the rule-based seed couldn't classify it.
        let movementPattern: String?
        let muscleGroup: String
        let weightKg: Double
        let reps: Int
    }

    struct Target {
        let equipment: String
        let movementPattern: String?
        let muscleGroup: String
    }

    /// How the comparables were chosen. Narrower is more trustworthy, and the
    /// UI says which one it used rather than presenting every estimate alike.
    enum Basis {
        /// Same movement pattern and equipment — the closest neighbours available.
        case sameEquipment
        /// Same pattern, different equipment. Load transfers loosely at best.
        case samePattern
        /// Pattern unknown or unmatched, so muscle group had to do.
        case muscleGroup
        /// Nothing comparable on file.
        case none

        var note: String {
            switch self {
            case .sameEquipment: "Same movement, same equipment — the closest read available."
            case .samePattern:   "Same movement on different equipment, so the load transfers loosely."
            case .muscleGroup:   "Matched on muscle group only — treat this as a rough starting point."
            case .none:          ""
            }
        }

        /// A new movement is unpracticed even when the muscles are trained, and
        /// the cost of starting light is one easy set.
        var discount: Double {
            switch self {
            case .sameEquipment: 0.85
            case .samePattern, .muscleGroup: 0.7
            case .none: 0
            }
        }
    }

    struct Result {
        let basis: Basis
        /// The lifts the estimate came from, heaviest first. Shown to the user.
        let comparables: [Candidate]
        /// Nil whenever basis is `.none` — an empty state beats an invented number.
        let rangeKg: (low: Double, high: Double)?
    }

    /// A standard olympic bar. Nothing lighter is loadable on a barbell movement.
    private static let barKg = 20.0

    /// Epley, matching `estimateOneRepMax` in the shared package exactly —
    /// including the rounding, which the TypeScript side applies too.
    private static func e1rm(_ weightKg: Double, _ reps: Int) -> Double {
        reps == 1 ? weightKg : (weightKg * (1 + Double(reps) / 30)).rounded()
    }

    private static func median(_ values: [Double]) -> Double {
        let sorted = values.sorted()
        let mid = sorted.count / 2
        return sorted.count.isMultiple(of: 2)
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid]
    }

    /// Patterns too broad to say anything about load. `isolation` covers calf
    /// raises and lateral raises alike, and `core`/`cardio` are categories
    /// rather than movements — for these, muscle group is the better neighbour,
    /// so they're treated the same as an unclassified exercise.
    private static let vaguePatterns: Set<String> = ["isolation", "core", "cardio"]

    private static func usable(_ pattern: String?) -> String? {
        guard let pattern, !vaguePatterns.contains(pattern) else { return nil }
        return pattern
    }

    /// Pick the neighbours to reason from, narrowest pool first.
    ///
    /// Movement pattern beats muscle group because the pattern is what
    /// determines load: barbell bench press and cable flyes are both `chest`,
    /// and differ by 3–4× in working weight.
    private static func selectNeighbours(
        _ target: Target, _ candidates: [Candidate]
    ) -> (basis: Basis, pool: [Candidate]) {
        let byPattern = usable(target.movementPattern).map { pattern in
            candidates.filter { $0.movementPattern == pattern }
        } ?? []

        let pool = byPattern.isEmpty
            ? candidates.filter { $0.muscleGroup == target.muscleGroup }
            : byPattern
        guard !pool.isEmpty else { return (.none, []) }

        let sameEquipment = pool.filter { $0.equipment == target.equipment }
        if !byPattern.isEmpty && !sameEquipment.isEmpty {
            return (.sameEquipment, sameEquipment)
        }
        return (byPattern.isEmpty ? .muscleGroup : .samePattern, pool)
    }

    /// A starting range for `target`, drawn from what this user already lifts.
    ///
    /// `repMax` is the top of the working rep range: the estimate targets the
    /// load they could carry for that many reps, so the first set errs light.
    static func suggest(
        for target: Target, from candidates: [Candidate], repMax: Int = 10
    ) -> Result {
        let usable = candidates.filter { $0.weightKg > 0 && $0.reps > 0 }
        let (basis, pool) = selectNeighbours(target, usable)
        guard basis != .none else { return Result(basis: .none, comparables: [], rangeKg: nil) }

        let comparables = pool.sorted { e1rm($0.weightKg, $0.reps) > e1rm($1.weightKg, $1.reps) }

        // Median rather than mean: one outlier lift shouldn't drag the estimate.
        let base = median(pool.map { e1rm($0.weightKg, $0.reps) })
        // Epley, inverted — the load that supports `repMax` reps.
        let atRepMax = base / (1 + Double(repMax) / 30)
        let high = atRepMax * basis.discount
        let low = high * 0.85

        // A barbell suggestion under the weight of the bar is unloadable, and
        // reads as the tool not knowing what a barbell is.
        if target.equipment == "barbell" && low < barKg {
            return Result(basis: basis, comparables: comparables,
                          rangeKg: (low: barKg, high: max(high, barKg)))
        }
        return Result(basis: basis, comparables: comparables, rangeKg: (low: low, high: high))
    }
}
