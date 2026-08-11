import Foundation

/// Double progression, encoded.
///
/// Behavioural mirror of `packages/shared/src/progression.ts`. iOS has no way
/// to import that package, so the two are kept in sync by hand — a change to
/// the tiers or thresholds here needs the same change there, or the two clients
/// will give contradictory advice about the same training log.
enum Progression {

    /// One logged working set. Dropsets are excluded upstream (parentSetId nil).
    struct Set {
        let weightKg: Double?
        let reps: Int?
        /// Workout start. Sets sharing this belong to the same session.
        let performedAt: Date
    }

    struct RepRange: Equatable {
        var min: Int
        var max: Int
        /// True when derived from this exercise's history rather than the default.
        var inferred: Bool
    }

    enum Readiness: String {
        /// Every working set cleared the top of the range — add weight.
        case addLoad
        /// Reps fell below the range — hold the load and build reps back up.
        case buildReps
        /// Inside the range — keep the load, keep pushing reps.
        case keepGoing
        /// Not enough logged history to say anything honest.
        case unknown
    }

    struct Assessment {
        var readiness: Readiness
        var range: RepRange
        /// Heaviest working load of the most recent session.
        var lastWeightKg: Double?
        /// Lowest rep count among that session's working sets — decides the verdict.
        var lowestReps: Int?
        /// Next load up, from weights this user has actually used. Nil when
        /// there's no basis to guess.
        var suggestedWeightKg: Double?
    }

    /// Sessions newest-first, each an array of that session's sets.
    static func groupSessions(_ sets: [Set]) -> [[Set]] {
        Dictionary(grouping: sets, by: \.performedAt)
            .sorted { $0.key > $1.key }
            .map(\.value)
    }

    /// The sets performed at the heaviest load of their session — the working sets.
    ///
    /// Everything lighter is a back-off set. Real logs are rarely straight sets:
    /// `160×6, 160×6, 155×9` is one hard double and a lighter third, not three
    /// sets that "failed" at 6. Back-off sets are volume, and volume is a
    /// different question from whether the load is ready to go up.
    ///
    /// Unweighted work (bodyweight, cardio) has no top load, so every set counts.
    private static func workingSets(_ session: [Set]) -> [Set] {
        let withReps = session.filter { ($0.reps ?? 0) > 0 }
        let weighted = withReps.filter { $0.weightKg != nil }
        guard let top = weighted.compactMap(\.weightKg).max() else { return withReps }
        return weighted.filter { $0.weightKg! >= top - 1e-9 }
    }

    private static func median(_ values: [Int]) -> Double {
        let sorted = values.sorted()
        let mid = sorted.count / 2
        return sorted.count.isMultiple(of: 2)
            ? Double(sorted[mid - 1] + sorted[mid]) / 2
            : Double(sorted[mid])
    }

    /// The rep range this exercise is actually trained in.
    ///
    /// Only recentres when the median sits *outside* the user's default range,
    /// so a heavy squat at 5 reps gets 4–6 while machine work stays on 8–10.
    ///
    /// That guard is load-bearing. Recentring unconditionally moves the
    /// goalposts with the athlete: someone reliably hitting 10 on a default
    /// 8–10 has a median of 10, which would infer 9–11 and demand 11 reps
    /// before ever saying "add load" — the feature would go quiet for exactly
    /// the person it exists to serve.
    ///
    /// Needs 3+ sessions first: two noisy early sessions shouldn't lock in a target.
    static func inferRepRange(_ sets: [Set], fallback: RepRange) -> RepRange {
        let sessions = groupSessions(sets)
        guard sessions.count >= 3 else { return RepRange(min: fallback.min, max: fallback.max, inferred: false) }

        // Working sets only — back-off sets carry higher reps by design, and
        // pooling them drags the median up.
        let reps = sessions.flatMap { workingSets($0).compactMap(\.reps) }
        guard !reps.isEmpty else { return RepRange(min: fallback.min, max: fallback.max, inferred: false) }

        let centre = Int(median(reps).rounded())
        if centre >= fallback.min && centre <= fallback.max {
            return RepRange(min: fallback.min, max: fallback.max, inferred: false)
        }

        let width = Swift.max(0, fallback.max - fallback.min)
        let low = Swift.max(1, centre - width / 2)
        return RepRange(min: low, max: low + width, inferred: true)
    }

    /// The next load up, drawn from this user's own history on this exercise.
    ///
    /// Avoids hardcoding "+5 lb", which is wrong for most equipment. A machine
    /// stack that jumps 65 → 80 suggests 80; a dumbbell rack suggests the next
    /// dumbbell. At the top of their ladder, repeat the smallest jump they've
    /// actually made. One weight ever logged gives no basis to guess.
    static func nextWeightUp(allWeightsKg: [Double], currentKg: Double) -> Double? {
        let ladder = Array(Swift.Set(allWeightsKg.filter { $0 > 0 })).sorted()
        guard ladder.count >= 2 else { return nil }

        if let heavier = ladder.first(where: { $0 > currentKg + 1e-9 }) { return heavier }

        // Already at or above their heaviest — reuse their smallest real increment.
        var smallestStep = Double.infinity
        for i in 1..<ladder.count {
            let step = ladder[i] - ladder[i - 1]
            if step > 1e-9 { smallestStep = Swift.min(smallestStep, step) }
        }
        return smallestStep.isFinite ? currentKg + smallestStep : nil
    }

    /// What to do next on this exercise.
    ///
    /// Judged on the working sets of the last session — those at its heaviest
    /// load — and on the *worst* of them, since one strong opener doesn't mean
    /// the load is ready to go up. A lighter back-off set never counts against you.
    static func assess(_ sets: [Set], fallback: RepRange) -> Assessment {
        let range = inferRepRange(sets, fallback: fallback)
        let working = workingSets(groupSessions(sets).first ?? [])

        guard !working.isEmpty, let lowestReps = working.compactMap(\.reps).min() else {
            return Assessment(readiness: .unknown, range: range,
                              lastWeightKg: nil, lowestReps: nil, suggestedWeightKg: nil)
        }

        let lastWeightKg = working.first?.weightKg // all working sets share the top load

        let readiness: Readiness = lowestReps >= range.max ? .addLoad
            : lowestReps < range.min ? .buildReps
            : .keepGoing

        var suggested: Double?
        if readiness == .addLoad, let current = lastWeightKg {
            suggested = nextWeightUp(allWeightsKg: sets.compactMap(\.weightKg), currentKg: current)
        }

        return Assessment(readiness: readiness, range: range,
                          lastWeightKg: lastWeightKg, lowestReps: lowestReps,
                          suggestedWeightKg: suggested)
    }
}
