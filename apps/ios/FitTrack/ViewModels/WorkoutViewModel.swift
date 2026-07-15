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
    /// Whether the live-session sheet is presented. The session itself keeps
    /// running while this is false — the tab-bar banner brings it back.
    var showActiveSession = false

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
        // One live session at a time — reopen the existing one instead of
        // creating a duplicate workout row.
        guard activeWorkout == nil else {
            showActiveSession = true
            return
        }
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
            showActiveSession = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Restore an unfinished session after an app relaunch so the banner
    /// resurfaces it. Does not auto-present the sheet.
    func restoreActiveSession(userId: UUID) async {
        guard activeWorkout == nil else { return }
        do {
            let unfinished: [Workout] = try await supabase
                .from("workouts")
                .select("*, workout_sets(*, exercises(*))")
                .eq("user_id", value: userId.uuidString)
                .is("finished_at", value: nil)
                .order("started_at", ascending: false)
                .limit(1)
                .execute()
                .value
            guard let workout = unfinished.first else { return }
            activeWorkout = workout
            activeSets = (workout.workoutSets ?? []).sorted { $0.loggedAt < $1.loggedAt }
        } catch {
            // Non-fatal: the user can still start a fresh session.
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
            let finished = Date()
            let duration = max(0, Int((finished.timeIntervalSince(w.startedAt) / 60).rounded()))
            try await supabase
                .from("workouts")
                .update(FinishWorkoutPayload(
                    finishedAt: ISO8601DateFormatter().string(from: finished),
                    durationMinutes: duration
                ))
                .eq("id", value: w.id.uuidString)
                .execute()
            activeWorkout = nil
            activeSets = []
            showActiveSession = false
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
            showActiveSession = false
        } catch {
            self.error = error.localizedDescription
        }
    }

    // ── Custom exercises ──────────────────────────────────────────────

    @discardableResult
    func createExercise(userId: UUID, name: String, muscleGroup: String,
                        secondaryMuscles: [String], equipment: String) async -> Exercise? {
        error = nil
        do {
            // RLS requires BOTH user_id = auth.uid() AND is_custom = true —
            // the insert is rejected if either is missing.
            let payload = NewExercisePayload(
                name: name,
                muscleGroup: muscleGroup,
                secondaryMuscles: secondaryMuscles,
                equipment: equipment,
                isCustom: true,
                userId: userId.uuidString
            )
            let created: Exercise = try await supabase
                .from("exercises")
                .insert(payload)
                .select()
                .single()
                .execute()
                .value
            exercises.append(created)
            exercises.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            return created
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    // ── Editing the live session ──────────────────────────────────────
    // Same DB writes as revision mode, but they also patch activeSets so
    // the in-progress screen reflects the change immediately.

    func updateActiveSet(_ id: UUID, weightKg: Double, reps: Int) async {
        guard let i = activeSets.firstIndex(where: { $0.id == id }) else { return }
        error = nil
        await updateSet(id, weightKg: weightKg, reps: reps, setNumber: activeSets[i].setNumber)
        guard error == nil else { return }
        activeSets[i].weightKg = weightKg
        activeSets[i].reps = reps
    }

    func deleteActiveSet(_ id: UUID) async {
        guard let removed = activeSets.first(where: { $0.id == id }) else { return }
        error = nil
        await deleteSet(id)
        guard error == nil else { return }
        activeSets.removeAll { $0.id == id }
        // Keep set numbers gapless so logSet's count-based numbering stays valid.
        var number = 0
        for i in activeSets.indices where activeSets[i].exerciseId == removed.exerciseId {
            number += 1
            guard activeSets[i].setNumber != number else { continue }
            await updateSet(activeSets[i].id,
                            weightKg: activeSets[i].weightKg ?? 0,
                            reps: activeSets[i].reps ?? 0,
                            setNumber: number)
            activeSets[i].setNumber = number
        }
    }

    func removeActiveExercise(_ exerciseId: UUID) async {
        guard let workout = activeWorkout else { return }
        error = nil
        do {
            try await supabase
                .from("workout_sets")
                .delete()
                .eq("workout_id", value: workout.id.uuidString)
                .eq("exercise_id", value: exerciseId.uuidString)
                .execute()
            activeSets.removeAll { $0.exerciseId == exerciseId }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // ── Editing logged sessions (revision mode) ───────────────────────
    // PRs are recomputed by Postgres triggers on any workout_sets change,
    // so callers should reload workouts afterwards to pick up fresh is_pr flags.

    func renameWorkout(_ id: UUID, name: String) async {
        do {
            try await supabase
                .from("workouts")
                .update(["name": name])
                .eq("id", value: id.uuidString)
                .execute()
            if let i = workouts.firstIndex(where: { $0.id == id }) { workouts[i].name = name }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteWorkout(_ id: UUID) async {
        do {
            try await supabase
                .from("workouts")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
            workouts.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateSet(_ id: UUID, weightKg: Double, reps: Int, setNumber: Int) async {
        do {
            try await supabase
                .from("workout_sets")
                .update(UpdateSetPayload(weightKg: weightKg, reps: reps, setNumber: setNumber))
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteSet(_ id: UUID) async {
        do {
            try await supabase
                .from("workout_sets")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // Add a set to an already-logged session (the "forgot to log it" case).
    func addSet(workoutId: UUID, exerciseId: UUID, weightKg: Double, reps: Int, setNumber: Int) async {
        do {
            let payload = LogSetPayload(
                workoutId: workoutId.uuidString,
                exerciseId: exerciseId.uuidString,
                setNumber: setNumber,
                weightKg: weightKg,
                reps: reps,
                loggedAt: ISO8601DateFormatter().string(from: Date())
            )
            try await supabase
                .from("workout_sets")
                .insert(payload)
                .execute()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// Close-out update: finished timestamp + stored duration (no live timer needed).
private struct FinishWorkoutPayload: Encodable {
    let finishedAt: String
    let durationMinutes: Int

    enum CodingKeys: String, CodingKey {
        case finishedAt      = "finished_at"
        case durationMinutes = "duration_minutes"
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

// Custom exercise insert. is_custom must be a real bool (not a string) or
// PostgREST rejects it, and RLS requires it true alongside user_id.
private struct NewExercisePayload: Encodable {
    let name: String
    let muscleGroup: String
    let secondaryMuscles: [String]
    let equipment: String
    let isCustom: Bool
    let userId: String

    enum CodingKeys: String, CodingKey {
        case name
        case muscleGroup      = "muscle_group"
        case secondaryMuscles = "secondary_muscles"
        case equipment
        case isCustom         = "is_custom"
        case userId           = "user_id"
    }
}

// Partial update of an existing set's load/reps/order.
private struct UpdateSetPayload: Encodable {
    let weightKg: Double
    let reps: Int
    let setNumber: Int

    enum CodingKeys: String, CodingKey {
        case weightKg  = "weight_kg"
        case reps
        case setNumber = "set_number"
    }
}
