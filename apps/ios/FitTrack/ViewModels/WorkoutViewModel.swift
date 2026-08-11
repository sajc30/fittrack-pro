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

    /// Logs a working set, or — when `parent` is given — a drop hanging off one.
    /// A drop takes its parent's set number and is excluded from set counts
    /// everywhere; it still contributes its full volume.
    func logSet(exerciseId: UUID, weight: Double, reps: Int, parent: WorkoutSet? = nil) async {
        guard let workout = activeWorkout else { return }
        let setNumber = parent?.setNumber
            ?? activeSets.filter { $0.exerciseId == exerciseId && $0.parentSetId == nil }.count + 1
        do {
            let payload = LogSetPayload(
                workoutId: workout.id.uuidString,
                exerciseId: exerciseId.uuidString,
                setNumber: setNumber,
                weightKg: weight,
                reps: reps,
                setType: parent == nil ? "normal" : "dropset",
                parentSetId: parent?.id.uuidString,
                supersetGroup: supersetGroup(for: exerciseId),
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

    // ── Supersets ─────────────────────────────────────────────────────
    // The pairing lives on the rows themselves, so it survives without any
    // client-side plan — unlike web, every exercise on this screen already has
    // at least one logged set to carry it.

    func supersetGroup(for exerciseId: UUID) -> Int? {
        activeSets.first { $0.exerciseId == exerciseId && $0.supersetGroup != nil }?.supersetGroup
    }

    /// Superset an exercise with any other in the session. Picking a partner
    /// that's already supersetted joins that group, which is how a third
    /// exercise gets added to an existing pairing.
    func joinSuperset(_ exerciseId: UUID, with partnerId: UUID) async {
        guard exerciseId != partnerId else { return }
        let group = supersetGroup(for: partnerId)
            ?? (activeSets.compactMap(\.supersetGroup).max() ?? 0) + 1
        await applySupersetGroup(group, to: [exerciseId, partnerId])
    }

    /// Break an exercise out of its superset, clearing the group entirely if
    /// that leaves a single exercise behind — a group of one means nothing.
    func leaveSuperset(_ exerciseId: UUID) async {
        let group = supersetGroup(for: exerciseId)
        await applySupersetGroup(nil, to: [exerciseId])

        guard let group else { return }
        let remaining = Set(
            activeSets.filter { $0.supersetGroup == group }.map(\.exerciseId)
        )
        if remaining.count < 2 { await applySupersetGroup(nil, to: Array(remaining)) }
    }

    /// Writes the group across every set already logged for these exercises, so
    /// history never shows a pairing on one side only.
    private func applySupersetGroup(_ group: Int?, to exerciseIds: [UUID]) async {
        guard let workoutId = activeWorkout?.id else { return }
        error = nil
        do {
            for id in exerciseIds {
                try await supabase
                    .from("workout_sets")
                    .update(SupersetGroupPayload(supersetGroup: group))
                    .eq("workout_id", value: workoutId.uuidString)
                    .eq("exercise_id", value: id.uuidString)
                    .execute()
                for i in activeSets.indices where activeSets[i].exerciseId == id {
                    activeSets[i].supersetGroup = group
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Persist the session note. Blank stores null rather than an empty string.
    /// Failure is swallowed on purpose: losing a note is bad, but interrupting a
    /// workout with an error over one is worse.
    func saveSessionNotes(_ text: String) async {
        guard let w = activeWorkout else { return }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        activeWorkout?.notes = trimmed.isEmpty ? nil : trimmed
        do {
            try await supabase
                .from("workouts")
                .update(NotesPayload(notes: trimmed.isEmpty ? nil : trimmed))
                .eq("id", value: w.id.uuidString)
                .execute()
        } catch {
            // Intentionally quiet — the text stays on screen either way.
        }
    }

    /// Set on close-out, cleared when the user dismisses the summary. Held here
    /// rather than in ActiveWorkoutView because finishing dismisses that view.
    var sessionSummary: SessionSummaryData?

    /// Reads the finished session before it's cleared.
    private func buildSummary(for w: Workout) -> SessionSummaryData {
        var sets = 0, reps = 0, prs = 0
        var volume = 0.0
        var groups: [String] = []

        // Every row counts toward reps and volume; only working sets count as sets.
        for s in activeSets {
            if s.parentSetId == nil { sets += 1 }
            if let r = s.reps {
                reps += r
                if let kg = s.weightKg { volume += Units.toLbs(kg) * Double(r) }
            }
            if s.isPr { prs += 1 }
            if let mg = s.exercise?.muscleGroup, !groups.contains(mg) { groups.append(mg) }
        }

        return SessionSummaryData(
            name: w.name ?? "Session",
            duration: max(0, Date().timeIntervalSince(w.startedAt)),
            sets: sets, reps: reps, volume: volume, prs: prs, muscleGroups: groups
        )
    }

    func finishWorkout() async {
        guard let w = activeWorkout else { return }
        let summary = buildSummary(for: w)   // before activeSets is cleared
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
            selectedExerciseId = nil
            sessionSummary = summary
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
            selectedExerciseId = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    // ── Exercise context ──────────────────────────────────────────────
    // One fetch backs both the last-time suggestion card and the recent
    // exercise list. RLS on the view scopes rows to the caller.

    var exerciseContext: [UUID: ExerciseContext] = [:]

    /// Which exercise the log panel is pointed at. Lives here rather than in
    /// ActiveWorkoutView's @State so minimising the session and reopening it
    /// doesn't silently clear the selection mid-workout, and is mirrored to
    /// UserDefaults so it also survives the app being closed — matching the
    /// web store, which persists through a page reload.
    ///
    /// Cleared when a session finishes or is voided (see below): a selection
    /// with no session behind it is stale, not useful.
    var selectedExerciseId: UUID? {
        didSet {
            guard selectedExerciseId != oldValue else { return }
            let defaults = UserDefaults.standard
            if let id = selectedExerciseId {
                defaults.set(id.uuidString, forKey: Self.selectedExerciseKey)
            } else {
                defaults.removeObject(forKey: Self.selectedExerciseKey)
            }
        }
    }

    /// Resolves against the loaded catalog, so an id left over from a deleted
    /// or no-longer-visible exercise simply reads as no selection.
    var selectedExercise: Exercise? {
        exercises.first { $0.id == selectedExerciseId }
    }

    private static let selectedExerciseKey = "fittrack.activeSession.selectedExerciseId"

    init() {
        // Restore directly into storage — didSet doesn't fire during init, which
        // is what we want: no redundant write-back of the value we just read.
        selectedExerciseId = UserDefaults.standard
            .string(forKey: Self.selectedExerciseKey)
            .flatMap(UUID.init(uuidString:))
    }

    func loadExerciseContext() async {
        do {
            let rows: [ExerciseContext] = try await supabase
                .from("exercise_last_performance")
                .select("exercise_id, last_performed_at, last_sets")
                .order("last_performed_at", ascending: false)
                .execute()
                .value
            exerciseContext = Dictionary(rows.map { ($0.exerciseId, $0) }) { first, _ in first }
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Exercises trained most recently, newest first. Skips any whose catalog
    /// row isn't loaded yet rather than showing a nameless entry.
    ///
    /// Name breaks date ties: exerciseContext is a Dictionary and Swift's sort
    /// isn't stable, so two exercises trained on the same day would otherwise
    /// order arbitrarily — and could swap between launches. The web hook
    /// applies the same tie-break so both clients show the same order.
    func recentExercises(limit: Int = 8) -> [Exercise] {
        exerciseContext.values
            .compactMap { ctx -> (exercise: Exercise, at: Date)? in
                exercises.first { $0.id == ctx.exerciseId }.map { ($0, ctx.lastPerformedAt) }
            }
            .sorted { $0.at == $1.at ? $0.exercise.name < $1.exercise.name : $0.at > $1.at }
            .prefix(limit)
            .map(\.exercise)
    }

    // ── Progression ───────────────────────────────────────────────────

    struct ExerciseProgress: Identifiable {
        let id: UUID
        let name: String
        let assessment: Progression.Assessment
    }

    /// Progression verdicts for every exercise with logged history, computed
    /// from `workouts` already in memory. Only finished sessions count, and
    /// dropset rows are excluded — a drop belongs to the set above it.
    func progression(repMin: Int, repMax: Int) -> [ExerciseProgress] {
        let fallback = Progression.RepRange(min: repMin, max: repMax, inferred: false)

        var byExercise: [UUID: (name: String, sets: [Progression.Set])] = [:]
        for w in workouts where w.finishedAt != nil {
            for s in w.workoutSets ?? [] where s.parentSetId == nil {
                guard let ex = s.exercise else { continue }
                byExercise[ex.id, default: (ex.name, [])].sets.append(
                    Progression.Set(weightKg: s.weightKg, reps: s.reps, performedAt: w.startedAt)
                )
            }
        }

        return byExercise.compactMap { id, entry in
            let a = Progression.assess(entry.sets, fallback: fallback)
            guard a.readiness != .unknown else { return nil }
            return ExerciseProgress(id: id, name: entry.name, assessment: a)
        }
        .sorted { $0.name < $1.name }
    }

    // ── Starting point for an untrained exercise ──────────────────────

    /// Where to start on `exercise`, drawn from comparable lifts already on
    /// file. Nil once the exercise has history of its own — the last-performance
    /// card is the better answer then, and it's a fact rather than an estimate.
    ///
    /// Computed from `workouts` already in memory, so it costs no network.
    func startingPoint(for exercise: Exercise, repMax: Int) -> StartingPoint.Result? {
        // Best working set per exercise by estimated 1RM. Drops are excluded —
        // a drop is a deliberately reduced load and would understate the lift.
        var best: [UUID: (weightKg: Double, reps: Int, exercise: Exercise)] = [:]
        for w in workouts {
            for s in w.workoutSets ?? [] where s.parentSetId == nil {
                guard let kg = s.weightKg, kg > 0, let reps = s.reps, reps > 0,
                      let ex = s.exercise else { continue }
                let score = kg * (1 + Double(reps) / 30)
                if let current = best[ex.id],
                   score <= current.weightKg * (1 + Double(current.reps) / 30) { continue }
                best[ex.id] = (kg, reps, ex)
            }
        }

        guard best[exercise.id] == nil else { return nil }

        let candidates = best.map { id, entry in
            StartingPoint.Candidate(
                id: id, name: entry.exercise.name, equipment: entry.exercise.equipment,
                movementPattern: entry.exercise.movementPattern,
                muscleGroup: entry.exercise.muscleGroup,
                weightKg: entry.weightKg, reps: entry.reps
            )
        }

        return StartingPoint.suggest(
            for: .init(equipment: exercise.equipment,
                       movementPattern: exercise.movementPattern,
                       muscleGroup: exercise.muscleGroup),
            from: candidates,
            repMax: repMax
        )
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
        // Deleting a working set takes its drops with it — the FK cascades in
        // the database, so the local copy has to follow.
        activeSets.removeAll { $0.id == id || $0.parentSetId == id }

        // Keep set numbers gapless so logSet's count-based numbering stays
        // valid. Drops inherit their parent's number rather than taking one.
        var number = 0
        var byParent: [UUID: Int] = [:]
        for i in activeSets.indices where activeSets[i].exerciseId == removed.exerciseId {
            let target: Int
            if let parent = activeSets[i].parentSetId {
                guard let inherited = byParent[parent] else { continue }
                target = inherited
            } else {
                number += 1
                byParent[activeSets[i].id] = number
                target = number
            }
            guard activeSets[i].setNumber != target else { continue }
            await updateSet(activeSets[i].id,
                            weightKg: activeSets[i].weightKg ?? 0,
                            reps: activeSets[i].reps ?? 0,
                            setNumber: target)
            activeSets[i].setNumber = target
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
            // Don't leave the log panel pointed at an exercise just removed.
            if selectedExerciseId == exerciseId { selectedExerciseId = nil }
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
                // Revision mode only adds working sets; drops are built live.
                setType: "normal",
                parentSetId: nil,
                supersetGroup: nil,
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
private struct NotesPayload: Encodable {
    let notes: String?
}

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
    let setType: String
    let parentSetId: String?
    let supersetGroup: Int?
    let loggedAt: String

    enum CodingKeys: String, CodingKey {
        case workoutId     = "workout_id"
        case exerciseId    = "exercise_id"
        case setNumber     = "set_number"
        case weightKg      = "weight_kg"
        case reps
        case setType       = "set_type"
        case parentSetId   = "parent_set_id"
        case supersetGroup = "superset_group"
        case loggedAt      = "logged_at"
    }
}

// Stamps (or clears) the superset pairing across an exercise's logged sets.
private struct SupersetGroupPayload: Encodable {
    let supersetGroup: Int?

    enum CodingKeys: String, CodingKey {
        case supersetGroup = "superset_group"
    }

    // Hand-written on purpose. Synthesized encoding uses encodeIfPresent, which
    // drops a nil field entirely — the PATCH body would be `{}` and breaking a
    // superset would update nothing while the UI happily showed it cleared.
    // Clearing the column requires sending an explicit null.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        if let supersetGroup {
            try c.encode(supersetGroup, forKey: .supersetGroup)
        } else {
            try c.encodeNil(forKey: .supersetGroup)
        }
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
