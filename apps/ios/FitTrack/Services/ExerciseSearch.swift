import Foundation

/// Exercise name matching for the picker.
///
/// Behavioural mirror of `packages/shared/src/search.ts`. iOS has no way to
/// import that package, so the two are kept in sync by hand — a change to the
/// alias table or the scoring tiers here needs the same change there, or web
/// and iOS will rank the same query differently.
enum ExerciseSearch {

    /// Gym shorthand and common misspellings → words that appear in catalog names.
    private static let aliases: [String: String] = [
        // equipment shorthand
        "db": "dumbbell",
        "dumbell": "dumbbell",
        "dumbbel": "dumbbell",
        "bb": "barbell",
        "barbel": "barbell",
        "kb": "kettlebell",
        "ez": "ez bar",
        // movement shorthand
        "ohp": "overhead press",
        "bp": "bench press",
        "dl": "deadlift",
        "rdl": "romanian deadlift",
        "sldl": "stiff leg deadlift",
        "bor": "bent over row",
        "bss": "bulgarian split squat",
        "ghr": "glute ham raise",
        "military": "overhead press",
        "skullcrusher": "triceps extension",
        "skullcrushers": "triceps extension",
        // pluralisation the catalog doesn't use
        "lats": "lat",
        "pulldowns": "pulldown",
        "curls": "curl",
        "rows": "row",
        "squats": "squat",
        "raises": "raise",
        "presses": "press",
        "extensions": "extension",
    ]

    private static func tokenize(_ value: String) -> [String] {
        let cleaned = String(value.lowercased().map { ($0.isLetter || $0.isNumber) ? $0 : " " })
        return cleaned.split(separator: " ").flatMap { raw -> [String] in
            let token = String(raw)
            return (aliases[token] ?? token).split(separator: " ").map(String.init)
        }
    }

    /// True when `candidate` is within a typo's reach of `target`. The allowance
    /// scales with length so short words stay strict — at 2 edits, "row" would
    /// match "raise".
    private static func withinTypoDistance(_ candidate: String, _ target: String) -> Bool {
        let allowed = target.count <= 3 ? 0 : (target.count <= 5 ? 1 : 2)
        if allowed == 0 { return candidate == target }
        if abs(candidate.count - target.count) > allowed { return false }

        let a = Array(candidate), b = Array(target)
        guard !a.isEmpty, !b.isEmpty else { return a.isEmpty && b.isEmpty }

        var prev = Array(0...b.count)
        for i in 1...a.count {
            var row = [i] + Array(repeating: 0, count: b.count)
            var best = i
            for j in 1...b.count {
                let cost = a[i - 1] == b[j - 1] ? 0 : 1
                row[j] = min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
                best = min(best, row[j])
            }
            if best > allowed { return false } // no cell can recover — bail early
            prev = row
        }
        return prev[b.count] <= allowed
    }

    /// Ranked match strength, 0 (no match) to 1 (exact).
    static func score(name: String, query: String) -> Double {
        let queryTokens = tokenize(query)
        if queryTokens.isEmpty { return 1 }

        let nameTokens = tokenize(name)
        let nameText = nameTokens.joined(separator: " ")
        let queryText = queryTokens.joined(separator: " ")

        if nameText == queryText { return 1 }
        if nameText.hasPrefix(queryText) { return 0.9 }
        if nameText.contains(queryText) { return 0.8 }

        // "inc db p" → "Incline Dumbbell Press": each token prefixes a later word.
        var cursor = 0
        var ordered = true
        for token in queryTokens {
            var matched = false
            while cursor < nameTokens.count {
                let candidate = nameTokens[cursor]
                cursor += 1
                if candidate.hasPrefix(token) { matched = true; break }
            }
            if !matched { ordered = false; break }
        }
        if ordered { return 0.7 }

        // Same words, any order: "press bench" → "Bench Press".
        if queryTokens.allSatisfy({ t in nameTokens.contains { $0.hasPrefix(t) } }) { return 0.6 }

        // Last resort — spelling slipped.
        if queryTokens.allSatisfy({ t in nameTokens.contains { withinTypoDistance($0, t) } }) { return 0.4 }

        return 0
    }

    /// Matches ranked best-first: score, then preferred, then shortest name.
    ///
    /// `prefer` is normally "the user has trained this". Close typos can score
    /// identically on pure text — "benh pres" is one edit from both "Bent Press"
    /// and "Bench Press" — and no lexical rule separates them. What you lift does.
    ///
    /// The trailing name comparison is what Swift needs to be deterministic;
    /// JS gets it free from a stable sort over an already-alphabetical catalog.
    static func search(
        _ exercises: [Exercise],
        query: String,
        limit: Int? = nil,
        prefer: ((Exercise) -> Bool)? = nil
    ) -> [Exercise] {
        // An empty query is browsing, not searching — keep the catalog's own
        // ordering. Surfacing trained exercises there is the recents row's job.
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            return limit.map { Array(exercises.prefix($0)) } ?? exercises
        }

        let rank: (Exercise) -> Int = { prefer?($0) == true ? 1 : 0 }

        let ranked = exercises
            .map { (item: $0, score: score(name: $0.name, query: query)) }
            .filter { $0.score > 0 }
            .sorted { lhs, rhs in
                if lhs.score != rhs.score { return lhs.score > rhs.score }
                let (lr, rr) = (rank(lhs.item), rank(rhs.item))
                if lr != rr { return lr > rr }
                if lhs.item.name.count != rhs.item.name.count {
                    return lhs.item.name.count < rhs.item.name.count
                }
                return lhs.item.name < rhs.item.name
            }
            .map(\.item)

        return limit.map { Array(ranked.prefix($0)) } ?? ranked
    }
}
