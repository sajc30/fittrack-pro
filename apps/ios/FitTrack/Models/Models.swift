import Foundation

// ── Units ────────────────────────────────────────────────────────────
// The app is lbs-only in the UI; the database always stores kg.
enum Units {
    static let lbsPerKg = 2.20462
    static func toLbs(_ kg: Double) -> Double { kg * lbsPerKg }
    static func toKg(_ lbs: Double) -> Double { lbs / lbsPerKg }
}

// ── Profile ─────────────────────────────────────────────────────────
struct Profile: Codable, Identifiable, Equatable, Sendable {
    let id: UUID
    let userId: UUID
    var name: String?
    var dateOfBirth: String?
    var gender: String?
    var heightCm: Double?
    var weightKg: Double?
    var activityLevel: String?
    var goal: String?
    /// Default rep range for progression verdicts. Per-exercise ranges are
    /// inferred from history rather than stored — see Progression.
    var targetRepMin: Int?
    var targetRepMax: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case userId        = "user_id"
        case name
        case dateOfBirth   = "date_of_birth"
        case gender
        case heightCm      = "height_cm"
        case weightKg      = "weight_kg"
        case activityLevel = "activity_level"
        case goal
        case targetRepMin  = "target_rep_min"
        case targetRepMax  = "target_rep_max"
    }
}

// ── Exercise ─────────────────────────────────────────────────────────
struct Exercise: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let muscleGroup: String
    let equipment: String
    let secondaryMuscles: [String]
    /// Nullable on purpose — the rule-based seed in migration 004 can't classify
    /// everything, and an unclassified exercise falls back to muscle group
    /// rather than being guessed at.
    var movementPattern: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case muscleGroup      = "muscle_group"
        case equipment
        case secondaryMuscles = "secondary_muscles"
        case movementPattern  = "movement_pattern"
    }
}

// ── Workout ──────────────────────────────────────────────────────────
struct Workout: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    var name: String?
    let startedAt: Date
    var finishedAt: Date?
    /// One free-form note for this session. Mirrors the web's session note —
    /// there is deliberately no per-exercise equivalent.
    var notes: String?
    var workoutSets: [WorkoutSet]?

    enum CodingKeys: String, CodingKey {
        case id
        case userId     = "user_id"
        case name
        case startedAt  = "started_at"
        case finishedAt = "finished_at"
        case notes
        case workoutSets = "workout_sets"
    }
}

// ── WorkoutSet ───────────────────────────────────────────────────────
struct WorkoutSet: Codable, Identifiable, Sendable {
    let id: UUID
    let workoutId: UUID
    let exerciseId: UUID
    var setNumber: Int
    var weightKg: Double?
    var reps: Int?
    var isPr: Bool
    let loggedAt: Date
    /// Non-nil marks this row as a drop within the set above it, not a working
    /// set of its own. Counted for volume, excluded from set counts and
    /// progression verdicts.
    var parentSetId: UUID?
    /// Sets sharing this value within a session were performed as one superset.
    var supersetGroup: Int?
    var exercise: Exercise?

    enum CodingKeys: String, CodingKey {
        case id
        case workoutId   = "workout_id"
        case exerciseId  = "exercise_id"
        case setNumber   = "set_number"
        case weightKg    = "weight_kg"
        case reps
        case isPr        = "is_pr"
        case loggedAt    = "logged_at"
        case parentSetId   = "parent_set_id"
        case supersetGroup = "superset_group"
        case exercise      = "exercises"
    }
}

// ── PersonalRecord ───────────────────────────────────────────────────
struct PersonalRecord: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    let exerciseId: UUID
    let weightKg: Double
    let reps: Int
    let e1rm: Double
    let achievedAt: Date
    var exercise: Exercise?

    enum CodingKeys: String, CodingKey {
        case id
        case userId     = "user_id"
        case exerciseId = "exercise_id"
        case weightKg   = "weight_kg"
        case reps
        case e1rm       = "estimated_one_rep_max"
        case achievedAt = "achieved_at"
        case exercise   = "exercises"
    }
}

// ── ExerciseContext ──────────────────────────────────────────────────
// Reads the exercise_last_performance view — the same source as the web's
// lib/hooks/use-exercise-context.ts, so both clients suggest identical numbers.
// The view only reports finished sessions, so a workout in progress never
// shadows the one being compared against.

struct LastSet: Codable, Sendable {
    let setNumber: Int
    let weightKg: Double?
    let reps: Int?

    enum CodingKeys: String, CodingKey {
        case setNumber = "set_number"
        case weightKg  = "weight_kg"
        case reps
    }
}

struct ExerciseContext: Codable, Identifiable, Sendable {
    let exerciseId: UUID
    let lastPerformedAt: Date
    let lastSets: [LastSet]?

    var id: UUID { exerciseId }

    enum CodingKeys: String, CodingKey {
        case exerciseId      = "exercise_id"
        case lastPerformedAt = "last_performed_at"
        case lastSets        = "last_sets"
    }
}

// ── BodyMeasurement ──────────────────────────────────────────────────
struct BodyMeasurement: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    var weightKg: Double?
    let measuredAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId    = "user_id"
        case weightKg  = "weight_kg"
        case measuredAt = "measured_at"
    }
}
