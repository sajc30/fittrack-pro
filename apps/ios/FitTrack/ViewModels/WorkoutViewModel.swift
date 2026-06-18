import SwiftUI
import Supabase
import Foundation

@MainActor
@Observable
final class WorkoutViewModel {
    var workouts: [Workout] = []
    var exercises: [Exercise] = []
    var personalRecords: [PersonalRecord] = []
    var isLoading = false
    var error: String?

    // Active workout state
    var activeWorkout: Workout?
    var activeSets: [WorkoutSet] = []
    var isWorkoutActive: Bool { activeWorkout != nil }

    func loadWorkouts(userId: UUID) async {
        isLoading = true
        error = nil
        do {
            let response: [Workout] = try await supabase
                .from("workouts")
                .select("*, workout_sets(*, exercises(*))")
                .eq("user_id", value: userId.uuidString)
                .order("started_at", ascending: false)
                .limit(50)
                .execute()
                .value
            workouts = response
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadExercises() async {
        guard exercises.isEmpty else { return }
        do {
            let response: [Exercise] = try await supabase
                .from("exercises")
                .select()
                .order("name")
                .execute()
                .value
            exercises = response
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadPRs(userId: UUID) async {
        do {
            let response: [PersonalRecord] = try await supabase
                .from("personal_records")
                .select("*, exercises(*)")
                .eq("user_id", value: userId.uuidString)
                .order("achieved_at", ascending: false)
                .limit(10)
                .execute()
                .value
            personalRecords = response
        } catch {
            self.error = error.localizedDescription
        }
    }

    func beginWorkout(userId: UUID, name: String) async {
        do {
            let newWorkout: Workout = try await supabase
                .from("workouts")
                .insert([
                    "user_id":    userId.uuidString,
                    "name":       name,
                    "started_at": ISO8601DateFormatter().string(from: Date()),
                ])
                .select()
                .single()
                .execute()
                .value
            activeWorkout = newWorkout
            activeSets = []
        } catch {
            self.error = error.localizedDescription
        }
    }

    func logSet(exerciseId: UUID, weight: Double, reps: Int) async {
        guard let workout = activeWorkout else { return }
        let setNumber = activeSets.filter { $0.exerciseId == exerciseId }.count + 1
        do {
            let payload = LogSetPayload(
                workoutId: workout.id.uuidString,
                exerciseId: exerciseId.uuidString,
                setNumber: setNumber,
                weightKg: weight,
                reps: reps,
                loggedAt: ISO8601DateFormatter().string(from: Date())
            )
            let newSet: WorkoutSet = try await supabase
                .from("workout_sets")
                .insert(payload)
                .select("*, exercises(*)")
                .single()
                .execute()
                .value
            activeSets.append(newSet)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func finishWorkout() async {
        guard let w = activeWorkout else { return }
        do {
            try await supabase
                .from("workouts")
                .update(["finished_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: w.id.uuidString)
                .execute()
            activeWorkout = nil
            activeSets = []
            await loadWorkouts(userId: w.userId)
            await loadPRs(userId: w.userId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func voidWorkout() async {
        guard let workout = activeWorkout else { return }
        do {
            try await supabase
                .from("workouts")
                .delete()
                .eq("id", value: workout.id.uuidString)
                .execute()
            activeWorkout = nil
            activeSets = []
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// Typed payload avoids PostgREST rejecting numeric fields sent as strings
private struct LogSetPayload: Encodable {
    let workoutId: String
    let exerciseId: String
    let setNumber: Int
    let weightKg: Double
    let reps: Int
    let loggedAt: String

    enum CodingKeys: String, CodingKey {
        case workoutId  = "workout_id"
        case exerciseId = "exercise_id"
        case setNumber  = "set_number"
        case weightKg   = "weight_kg"
        case reps
        case loggedAt   = "logged_at"
    }
}
