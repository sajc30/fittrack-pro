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
    }
}

// ── Exercise ─────────────────────────────────────────────────────────
struct Exercise: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let muscleGroup: String
    let equipment: String
    let secondaryMuscles: [String]

    enum CodingKeys: String, CodingKey {
        case id, name
        case muscleGroup     = "muscle_group"
        case equipment
        case secondaryMuscles = "secondary_muscles"
    }
}

// ── Workout ──────────────────────────────────────────────────────────
struct Workout: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    var name: String?
    let startedAt: Date
    var finishedAt: Date?
    var workoutSets: [WorkoutSet]?

    enum CodingKeys: String, CodingKey {
        case id
        case userId     = "user_id"
        case name
        case startedAt  = "started_at"
        case finishedAt = "finished_at"
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
    var exercise: Exercise?

    enum CodingKeys: String, CodingKey {
        case id
        case workoutId  = "workout_id"
        case exerciseId = "exercise_id"
        case setNumber  = "set_number"
        case weightKg   = "weight_kg"
        case reps
        case isPr       = "is_pr"
        case loggedAt   = "logged_at"
        case exercise   = "exercises"
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
