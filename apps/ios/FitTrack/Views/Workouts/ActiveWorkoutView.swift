import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(ProfileViewModel.self) private var profile

    @State private var weightInput = ""
    @State private var repsInput   = ""
    @State private var noteExpanded = false
    @State private var noteDraft = ""
    @State private var showExercisePicker = false
    @State private var showVoidConfirm = false
    @State private var editingSet: WorkoutSet?
    /// The working set a new drop will hang off, while the drop sheet is open.
    @State private var dropParent: WorkoutSet?
    /// The exercise being supersetted, while its partner picker is open.
    @State private var supersetFor: Exercise?
    @State private var exerciseToRemove: Exercise?
    @State private var showRemoveExerciseConfirm = false
    @Environment(\.dismiss) private var dismiss

    private let weightUnitLabel = "LBS"

    // Selection is held by the view model so it survives dismissing this view.
    // The picker still takes a plain binding, so WorkoutDetailView is unaffected.
    private var selectedExercise: Exercise? { workout.selectedExercise }

    private var selectedExerciseBinding: Binding<Exercise?> {
        Binding(
            get: { workout.selectedExercise },
            set: { workout.selectedExerciseId = $0?.id }
        )
    }

    // Latest logged body weight wins over the profile field, mirroring the Body page.
    private var currentBodyweightDisplay: Double? {
        guard let kg = profile.measurements.first?.weightKg ?? profile.profile?.weightKg else { return nil }
        return Units.toLbs(kg)
    }

    // Group sets by exercise for display
    private var setsByExercise: [(exercise: Exercise?, sets: [WorkoutSet])] {
        let exerciseIds = workout.activeSets.map { $0.exerciseId }
        var seen: [UUID] = []
        for id in exerciseIds where !seen.contains(id) { seen.append(id) }
        return seen.map { id in
            let sets = workout.activeSets.filter { $0.exerciseId == id }
            return (sets.first?.exercise, sets)
        }
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.35)

            VStack(spacing: 0) {
                // Header
                HStack {
                    // Minimize — the session keeps running; the tab-bar banner brings it back.
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.bpTextSecondary)
                            .frame(width: 30, height: 30)
                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text("ACTIVE SESSION").figLabel(size: 10)
                        Text(workout.activeWorkout?.name ?? "Session")
                            .font(.blueprint(16, weight: .semibold))
                            .foregroundStyle(Color.bpTextPrimary)
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                    Spacer()
                    // Void button
                    Button { showVoidConfirm = true } label: {
                        Text("VOID")
                            .font(.blueprint(10, weight: .medium))
                            .tracking(2)
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .foregroundStyle(Color.bpRedline)
                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.5), lineWidth: 1))
                    }
                    // Finish button
                    Button { finishWorkout() } label: {
                        Text("FINISH")
                            .font(.blueprint(10, weight: .semibold))
                            .tracking(2)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(Color.bpPaper)
                            .foregroundStyle(Color.bpInk)
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)

                sessionNoteStrip
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)

                Divider().background(Color.bpLine).padding(.horizontal, 20)

                // Sets list
                ScrollView {
                    VStack(spacing: 12) {
                        if setsByExercise.isEmpty {
                            VStack(spacing: 8) {
                                Text("NO SETS LOGGED YET")
                                    .figLabel(size: 11)
                                Text("Select an exercise below to begin.")
                                    .font(.blueprint(12))
                                    .foregroundStyle(Color.bpTextGhost)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                        }
                        ForEach(setsByExercise, id: \.sets.first?.exerciseId) { group in
                            exerciseCard(group)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                }

                Divider().background(Color.bpLine).padding(.horizontal, 20)

                // Log set panel
                VStack(spacing: 12) {
                    // Exercise selector
                    Button { showExercisePicker = true } label: {
                        HStack {
                            Text(selectedExercise?.name ?? "SELECT EXERCISE")
                                .font(.blueprint(12))
                                .foregroundStyle(selectedExercise != nil ? Color.bpTextPrimary : Color.bpTextGhost)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.bpTextGhost)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(Color.bpSheetInset)
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                    }

                    // Exactly one of these applies: a trained exercise has a last
                    // performance, an untrained one gets comparables to reason from.
                    if let ex = selectedExercise,
                       let context = workout.exerciseContext[ex.id],
                       let sets = context.lastSets, !sets.isEmpty {
                        LastPerformanceCard(context: context, sets: sets) { weight in
                            weightInput = weight
                        }
                    } else if let ex = selectedExercise,
                              let suggestion = workout.startingPoint(
                                  for: ex, repMax: profile.profile?.targetRepMax ?? 10) {
                        StartingPointCard(result: suggestion, pattern: ex.movementPattern) { weight in
                            weightInput = weight
                        }
                    }

                    if selectedExercise?.equipment == "bodyweight" {
                        Text(bodyweightHint)
                            .font(.blueprint(10))
                            .foregroundStyle(Color.bpTextGhost)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("WEIGHT (\(weightUnitLabel))").figLabel(size: 8)
                            BPTextField(placeholder: "e.g. 80", text: $weightInput)
                                .keyboardType(.decimalPad)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("REPS").figLabel(size: 8)
                            BPTextField(placeholder: "e.g. 5", text: $repsInput)
                                .keyboardType(.numberPad)
                        }
                        BPButton(title: "+ LOG",
                                 action: logSet,
                                 isDisabled: selectedExercise == nil || weightInput.isEmpty || repsInput.isEmpty)
                            .frame(width: 80)
                            .padding(.top, 14)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(Color.bpSheet)
            }
        }
        .sheet(isPresented: $showExercisePicker) {
            ExercisePickerSheet(selected: selectedExerciseBinding)
        }
        .sheet(item: $editingSet) { set in
            EditSetSheet(set: set)
        }
        .sheet(item: $dropParent) { parent in
            AddDropSheet(parent: parent,
                         startingWeightKg: lastWeightInChain(parent))
        }
        // Any exercise in the session can be the partner — a native dialog keeps
        // every choice a full-width row rather than a cramped custom menu.
        .confirmationDialog(
            "SUPERSET \(supersetFor?.name.uppercased() ?? "")",
            isPresented: Binding(get: { supersetFor != nil },
                                 set: { if !$0 { supersetFor = nil } }),
            titleVisibility: .visible
        ) {
            if let ex = supersetFor {
                ForEach(supersetCandidates(for: ex.id)) { partner in
                    Button(partnerTitle(partner)) {
                        Task { await workout.joinSuperset(ex.id, with: partner.id) }
                    }
                }
                if let g = workout.supersetGroup(for: ex.id) {
                    Button("Leave superset \(letter(g))", role: .destructive) {
                        Task { await workout.leaveSuperset(ex.id) }
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Pair this exercise with another one you're doing in this session.")
        }
        .confirmationDialog("REMOVE \(exerciseToRemove?.name.uppercased() ?? "EXERCISE")?",
                            isPresented: $showRemoveExerciseConfirm, titleVisibility: .visible) {
            Button("Remove & Delete Sets", role: .destructive) {
                guard let ex = exerciseToRemove else { return }
                Task { await workout.removeActiveExercise(ex.id) }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("All sets logged for this exercise in this session will be deleted.")
        }
        .dismissesKeyboardOnTap()
        .confirmationDialog("VOID SESSION?", isPresented: $showVoidConfirm, titleVisibility: .visible) {
            Button("Void & Delete", role: .destructive) { voidWorkout() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This session will be permanently deleted and no sets will be saved.")
        }
        .onChange(of: selectedExercise) { _, newValue in
            guard newValue?.equipment == "bodyweight", weightInput.isEmpty,
                  let bw = currentBodyweightDisplay else { return }
            weightInput = fmt(bw)
        }
        // Needed when the session is reopened with an exercise already selected,
        // i.e. without going through the picker. The catalog matters as much as
        // the context here: a restored selectedExerciseId resolves against
        // `exercises`, so on a cold launch it reads as no selection until the
        // catalog is in memory.
        .task {
            await workout.loadExercises()
            await workout.loadExerciseContext()
        }
    }

    private typealias ExerciseGroup = (exercise: Exercise?, sets: [WorkoutSet])

    /// The load at the bottom of a set's chain — what a new drop starts from,
    /// since a drop is the weight before it, reduced.
    private func lastWeightInChain(_ parent: WorkoutSet) -> Double? {
        (workout.activeSets.last { $0.parentSetId == parent.id } ?? parent).weightKg
    }

    /// Working sets in order, each followed by its drops. Log order already
    /// nests correctly, but an edited session shouldn't depend on that.
    private func chainOrder(_ sets: [WorkoutSet]) -> [WorkoutSet] {
        let drops = sets.filter { $0.parentSetId != nil }
        return sets
            .filter { $0.parentSetId == nil }
            .sorted { $0.setNumber < $1.setNumber }
            .flatMap { parent in [parent] + drops.filter { $0.parentSetId == parent.id } }
    }

    /// Group 1 → A, 2 → B. Numbers would read as set counts; letters don't.
    private func letter(_ group: Int) -> String {
        String(UnicodeScalar(64 + UInt8(clamping: group)) ?? "A")
    }

    /// Names the group being joined, so picking an exercise that's already
    /// supersetted doesn't silently pull you into a different pairing.
    private func partnerTitle(_ partner: Exercise) -> String {
        guard let g = workout.supersetGroup(for: partner.id) else { return partner.name }
        return "\(partner.name) — join superset \(letter(g))"
    }

    /// Exercises this one can be supersetted with — everything else in the
    /// session that isn't already in the same group.
    private func supersetCandidates(for exerciseId: UUID) -> [Exercise] {
        let mine = workout.supersetGroup(for: exerciseId)
        return setsByExercise.compactMap(\.exercise).filter { candidate in
            guard candidate.id != exerciseId else { return false }
            let theirs = workout.supersetGroup(for: candidate.id)
            return mine == nil || theirs != mine
        }
    }

    @ViewBuilder
    private func exerciseCard(_ group: ExerciseGroup) -> some View {
        let ordered = chainOrder(group.sets)
        let lastWorking = ordered.last { $0.parentSetId == nil }
        let groupNo = group.sets.compactMap(\.supersetGroup).first

        SheetCard {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Text(group.exercise?.name ?? "Unknown")
                        .font(.blueprint(12, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                    if let groupNo {
                        Text("SS \(letter(groupNo))")
                            .font(.blueprint(9, weight: .semibold))
                            .tracking(1)
                            .foregroundStyle(Color.bpInk)
                            .padding(.horizontal, 5).padding(.vertical, 2)
                            .background(Color.bpTextGhost)
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                    }
                    Spacer()
                    if let ex = group.exercise {
                        Button {
                            exerciseToRemove = ex
                            showRemoveExerciseConfirm = true
                        } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.bpRedline.opacity(0.8))
                                .frame(width: 34, height: 34)
                                .contentShape(Rectangle())
                        }
                    }
                }
                .padding(.bottom, 4)
                Divider().background(Color.bpLine)

                ForEach(ordered) { set in
                    setRow(set)
                }

                // Extend the last set into a dropset, or pair this exercise with
                // the one above it. Both are full-width 44pt rows — mid-workout
                // taps land on a thumb, not a cursor.
                HStack(spacing: 8) {
                    if let parent = lastWorking {
                        Button { dropParent = parent } label: {
                            actionChip(icon: "arrow.turn.down.right", title: "DROPSET")
                        }
                        .buttonStyle(.plain)
                    }
                    if let ex = group.exercise, setsByExercise.count > 1 {
                        Button { supersetFor = ex } label: {
                            actionChip(icon: "link",
                                       title: groupNo.map { "SUPERSET \(letter($0))" } ?? "SUPERSET")
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 2)
            }
            .padding(14)
        }
    }

    private func actionChip(icon: String, title: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 11))
            Text(title).font(.blueprint(10, weight: .semibold)).tracking(1.2)
        }
        .foregroundStyle(Color.bpTextSecondary)
        .frame(maxWidth: .infinity)
        .frame(height: 44)   // HIG minimum
        .contentShape(Rectangle())
        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
    }

    @ViewBuilder
    private func setRow(_ set: WorkoutSet) -> some View {
        let isDrop = set.parentSetId != nil
        HStack(spacing: 10) {
            Text(isDrop ? "↳" : "SET \(set.setNumber)")
                .font(.blueprint(10))
                .foregroundStyle(Color.bpTextGhost)
                .frame(width: 44, alignment: isDrop ? .trailing : .leading)
            Text(setWeightLabel(set))
                .font(.blueprint(13))
                .foregroundStyle(isDrop ? Color.bpTextSecondary : Color.bpTextPrimary)
            Spacer()
            if set.isPr { Stamp(text: "PR").scaleEffect(0.8) }
            Button { editingSet = set } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.bpTextGhost)
                    .frame(width: 34, height: 34)
                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
            }
            Button {
                Task { await workout.deleteActiveSet(set.id) }
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.bpRedline.opacity(0.8))
                    .frame(width: 34, height: 34)
                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.4), lineWidth: 1))
            }
        }
    }

    /// One free-form note for the session, available from the moment it starts.
    /// Collapsed by default so it costs nothing when unused; once written, the
    /// preview keeps it visible. Mirrors the web's session note.
    @ViewBuilder
    private var sessionNoteStrip: some View {
        if noteExpanded {
            VStack(alignment: .leading, spacing: 6) {
                Text("SESSION NOTE").figLabel(size: 9)
                TextEditor(text: $noteDraft)
                    .font(.blueprint(12))
                    .foregroundStyle(Color.bpTextPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(height: 70)
                    .padding(6)
                    .background(Color.bpSheetInset)
                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                // Full-width and 44pt tall: this is the only way out of the
                // editor, and a text-sized target is a miss waiting to happen
                // with a thumb mid-workout.
                BPButton(title: "DONE") {
                    noteExpanded = false
                    Task { await workout.saveSessionNotes(noteDraft) }
                }
            }
        } else {
            Button {
                noteDraft = workout.activeWorkout?.notes ?? ""
                noteExpanded = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.bpTextGhost)
                    Text(workout.activeWorkout?.notes ?? "Add a note for this session")
                        .font(.blueprint(11))
                        .foregroundStyle(workout.activeWorkout?.notes == nil ? Color.bpTextGhost : Color.bpTextSecondary)
                        .lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 44) // HIG minimum — thumb target, not a text link
                .background(Color.bpSheetInset)
                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private var bodyweightHint: String {
        if let bw = currentBodyweightDisplay {
            return "Bodyweight exercise — load defaults to your logged body weight (\(fmt(bw)) \(weightUnitLabel)). Edit it to add a vest or belt."
        }
        return "Bodyweight exercise — log your body weight as the load, plus any added weight (vest, belt)."
    }

    private func fmt(_ v: Double) -> String {
        v.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", v) : String(format: "%.1f", v)
    }

    private func setWeightLabel(_ set: WorkoutSet) -> String {
        guard let kg = set.weightKg else { return "— × \(set.reps ?? 0) reps" }
        let display = Units.toLbs(kg)
        let formatted = display.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", display)
            : String(format: "%.1f", display)
        return "\(formatted) \(weightUnitLabel) × \(set.reps ?? 0) reps"
    }

    private func logSet() {
        guard let ex = selectedExercise,
              let inputVal = Double(weightInput),
              let reps = Int(repsInput) else { return }
        let weightKg = Units.toKg(inputVal)
        Task {
            await workout.logSet(exerciseId: ex.id, weight: weightKg, reps: reps)
            repsInput = ""
        }
    }

    private func finishWorkout() {
        Task {
            // Commit an open note first — closing out shouldn't discard text the
            // user typed but never tapped Done on.
            if noteExpanded { await workout.saveSessionNotes(noteDraft) }
            // The summary is built and held by the view model, not here:
            // finishWorkout() sets showActiveSession = false, which dismisses
            // this very view, so a cover presented from here would race its own
            // dismissal. The root view presents it instead.
            await workout.finishWorkout()
        }
    }

    private func voidWorkout() {
        Task { await workout.voidWorkout() }
    }
}

// ── Edit Set Sheet (live revision) ───────────────────────────────────
struct EditSetSheet: View {
    let set: WorkoutSet

    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss
    @State private var weightInput = ""
    @State private var repsInput = ""

    private let weightUnitLabel = "LBS"

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.bpLine)
                    .frame(width: 36, height: 4)
                    .padding(.top, 12)
                Text("REVISE — \(set.exercise?.name.uppercased() ?? "SET") · SET \(set.setNumber)")
                    .figLabel(size: 10)

                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("WEIGHT (\(weightUnitLabel))").figLabel(size: 8)
                        BPTextField(placeholder: "e.g. 80", text: $weightInput)
                            .keyboardType(.decimalPad)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("REPS").figLabel(size: 8)
                        BPTextField(placeholder: "e.g. 5", text: $repsInput)
                            .keyboardType(.numberPad)
                    }
                }
                .padding(.horizontal, 20)

                BPButton(title: "SAVE REVISION",
                         action: save,
                         isDisabled: Double(weightInput) == nil || Int(repsInput) == nil)
                    .padding(.horizontal, 20)

                Spacer()
            }
        }
        .presentationDetents([.height(280)])
        .onAppear {
            if let kg = set.weightKg {
                let display = Units.toLbs(kg)
                weightInput = display.truncatingRemainder(dividingBy: 1) == 0
                    ? String(format: "%.0f", display)
                    : String(format: "%.1f", display)
            }
            repsInput = set.reps.map(String.init) ?? ""
        }
    }

    private func save() {
        guard let inputVal = Double(weightInput), let reps = Int(repsInput) else { return }
        let weightKg = Units.toKg(inputVal)
        Task {
            await workout.updateActiveSet(set.id, weightKg: weightKg, reps: reps)
            dismiss()
        }
    }
}

// MARK: - Starting point card

/// What to do on an exercise with no history. Mirrors the web's
/// starting-point-card.tsx.
///
/// Leads with the user's own comparable lifts rather than a single confident
/// number: the range is an estimate, and a number presented alone invites
/// loading a bar that hasn't been earned. Tapping a comparable loads its weight,
/// same as the last-performance card — the estimate is a suggestion, the user's
/// own lift is a fact.
private struct StartingPointCard: View {
    let result: StartingPoint.Result
    let pattern: String?
    let onApply: (String) -> Void

    private let weightUnitLabel = "LBS"

    /// Round to something you can actually load on a machine or a bar.
    private func plate(_ kg: Double) -> Int {
        Int((Units.toLbs(kg) / 5).rounded()) * 5
    }

    private func exact(_ kg: Double) -> String {
        let lbs = (Units.toLbs(kg) * 10).rounded() / 10
        return lbs.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", lbs)
            : String(format: "%.1f", lbs)
    }

    private var patternLabel: String? {
        pattern?.replacingOccurrences(of: "_", with: " ").uppercased()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("NO HISTORY ON FILE").figLabel(size: 9)
                Spacer()
                if let patternLabel {
                    Text(patternLabel)
                        .font(.blueprint(9))
                        .tracking(1)
                        .foregroundStyle(Color.bpTextGhost)
                }
            }

            if let range = result.rangeKg {
                Text("Your comparable lifts")
                    .font(.blueprint(10))
                    .foregroundStyle(Color.bpTextGhost)

                ForEach(result.comparables.prefix(3)) { c in
                    Button {
                        onApply(exact(c.weightKg))
                    } label: {
                        HStack(spacing: 10) {
                            Text(c.name)
                                .font(.blueprint(11))
                                .foregroundStyle(Color.bpTextSecondary)
                                .lineLimit(1)
                            Spacer()
                            Text("\(exact(c.weightKg)) \(weightUnitLabel) × \(c.reps)")
                                .font(.blueprint(12))
                                .foregroundStyle(Color.bpTextPrimary)
                            Image(systemName: "arrow.turn.down.left")
                                .font(.system(size: 12))
                                .foregroundStyle(Color.bpTextGhost)
                        }
                        .contentShape(Rectangle())   // whole row taps, not just the glyph
                        .frame(minHeight: 44)        // HIG minimum
                    }
                    .buttonStyle(.plain)
                }

                Divider().background(Color.bpLine)

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("SUGGESTED START").figLabel(size: 9)
                    Text("\(plate(range.low))–\(plate(range.high)) \(weightUnitLabel)")
                        .font(.blueprint(15, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                }
                Text("\(result.basis.note) Start at the low end and add load once you clear the top of your rep range.")
                    .font(.blueprint(10))
                    .foregroundStyle(Color.bpTextGhost)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Nothing comparable in your log yet. Start light, see how it moves, and the next session will have something to go on.")
                    .font(.blueprint(11))
                    .foregroundStyle(Color.bpTextGhost)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bpSheetInset)
        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
    }
}

// ── Add Drop Sheet ───────────────────────────────────────────────────

/// Logging a drop off a working set. Deliberately a sheet rather than a mode on
/// the main log panel: "the next set I log is a drop" is invisible state, and
/// invisible state mid-workout is how sets end up attached to the wrong thing.
struct AddDropSheet: View {
    let parent: WorkoutSet
    /// Load at the bottom of the chain so far — prefilled, then dropped.
    let startingWeightKg: Double?

    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss
    @State private var weightInput = ""
    @State private var repsInput = ""

    private let weightUnitLabel = "LBS"

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.bpLine)
                    .frame(width: 36, height: 4)
                    .padding(.top, 12)
                Text("DROPSET — \(parent.exercise?.name.uppercased() ?? "SET") · SET \(parent.setNumber)")
                    .figLabel(size: 10)
                Text("Counts as part of set \(parent.setNumber), not a set of its own.")
                    .font(.blueprint(11))
                    .foregroundStyle(Color.bpTextGhost)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("WEIGHT (\(weightUnitLabel))").figLabel(size: 8)
                        BPTextField(placeholder: "e.g. 80", text: $weightInput)
                            .keyboardType(.decimalPad)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("REPS").figLabel(size: 8)
                        BPTextField(placeholder: "e.g. 8", text: $repsInput)
                            .keyboardType(.numberPad)
                    }
                }
                .padding(.horizontal, 20)

                BPButton(title: "LOG DROPSET",
                         action: save,
                         isDisabled: Double(weightInput) == nil || Int(repsInput) == nil)
                    .padding(.horizontal, 20)

                Spacer()
            }
        }
        .presentationDetents([.height(320)])
        .onAppear {
            guard let kg = startingWeightKg else { return }
            let display = Units.toLbs(kg)
            weightInput = display.truncatingRemainder(dividingBy: 1) == 0
                ? String(format: "%.0f", display)
                : String(format: "%.1f", display)
        }
    }

    private func save() {
        guard let inputVal = Double(weightInput), let reps = Int(repsInput) else { return }
        Task {
            await workout.logSet(exerciseId: parent.exerciseId,
                                 weight: Units.toKg(inputVal),
                                 reps: reps,
                                 parent: parent)
            dismiss()
        }
    }
}

// ── Exercise Picker Sheet ────────────────────────────────────────────
// MARK: - Last performance card

/// What you did last time, offered rather than applied. Mirrors the web's
/// last-performance-card.tsx: tapping a row loads the *weight* only. Reps are
/// what the session is there to find out, so carrying them over would presume
/// the answer.
private struct LastPerformanceCard: View {
    let context: ExerciseContext
    let sets: [LastSet]
    let onApply: (String) -> Void

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d MMM"
        return f
    }()

    private func displayWeight(_ kg: Double) -> String {
        let lbs = (Units.toLbs(kg) * 10).rounded() / 10
        return lbs.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", lbs)
            : String(format: "%.1f", lbs)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("LAST — \(Self.dayFormatter.string(from: context.lastPerformedAt).uppercased())")
                .figLabel(size: 9)

            ForEach(Array(sets.enumerated()), id: \.offset) { _, set in
                let weight = set.weightKg.map(displayWeight)
                Button {
                    if let weight { onApply(weight) }
                } label: {
                    HStack(spacing: 10) {
                        Text("\(set.setNumber)")
                            .font(.blueprint(10))
                            .foregroundStyle(Color.bpTextGhost)
                            .frame(width: 12, alignment: .leading)
                        Text(weight.map { "\($0) LBS" } ?? "—")
                            .font(.blueprint(12))
                            .foregroundStyle(Color.bpTextPrimary)
                        Text("×  \(set.reps.map(String.init) ?? "—")")
                            .font(.blueprint(12))
                            .foregroundStyle(Color.bpTextSecondary)
                        Spacer()
                        if weight != nil {
                            Image(systemName: "arrow.turn.down.left")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.bpTextGhost)
                        }
                    }
                    .contentShape(Rectangle())   // whole row taps, not just the glyph
                    .frame(minHeight: 44)        // HIG minimum
                }
                .buttonStyle(.plain)
                .disabled(weight == nil)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bpSheetInset)
        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
    }
}

struct ExercisePickerSheet: View {
    @Binding var selected: Exercise?
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var showCreateSheet = false

    /// Ranked client-side — see ExerciseSearch. Exercises the user has actually
    /// trained break ties between equally-close typo matches.
    private var filtered: [Exercise] {
        let trained = Set(workout.exerciseContext.keys)
        return ExerciseSearch.search(workout.exercises, query: search) { trained.contains($0.id) }
    }

    private var recent: [Exercise] { workout.recentExercises(limit: 8) }

    /// Only on an unfiltered list — while searching, recents compete with the query.
    private var showRecent: Bool {
        search.trimmingCharacters(in: .whitespaces).isEmpty && !recent.isEmpty
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            VStack(spacing: 0) {
                // Handle + header
                VStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.bpLine)
                        .frame(width: 36, height: 4)
                    HStack {
                        Spacer()
                        Text("INDEX — CHOOSE EXERCISE").figLabel(size: 10)
                        Spacer()
                        Button { showCreateSheet = true } label: {
                            Text("+ NEW")
                                .font(.blueprint(11, weight: .semibold))
                                .tracking(1.5)
                                .padding(.horizontal, 12)
                                .frame(minHeight: 36)
                                .background(Color.bpPaper)
                                .foregroundStyle(Color.bpInk)
                                .clipShape(RoundedRectangle(cornerRadius: 2))
                        }
                    }
                    .padding(.horizontal, 20)
                    BPTextField(placeholder: "Search index…", text: $search)
                        .padding(.horizontal, 20)

                    if showRecent {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("RECENT").figLabel(size: 9)
                                .padding(.horizontal, 20)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(recent) { ex in
                                        Button {
                                            selected = ex
                                            dismiss()
                                        } label: {
                                            Text(ex.name.uppercased())
                                                .font(.blueprint(10))
                                                .tracking(1)
                                                .foregroundStyle(Color.bpTextSecondary)
                                                .lineLimit(1)
                                                .padding(.horizontal, 10)
                                                .frame(minHeight: 30)
                                                .background(Color.bpSheetInset)
                                                .overlay(RoundedRectangle(cornerRadius: 2)
                                                    .stroke(Color.bpLine, lineWidth: 1))
                                        }
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 12)

                Divider().background(Color.bpLine)

                List(filtered) { ex in
                    Button {
                        selected = ex
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ex.name)
                                    .font(.blueprint(13))
                                    .foregroundStyle(Color.bpTextPrimary)
                                Text(ex.muscleGroup.replacingOccurrences(of: "_", with: " ").uppercased())
                                    .figLabel(size: 9)
                            }
                            Spacer()
                            Text(ex.equipment.uppercased())
                                .font(.blueprint(9))
                                .foregroundStyle(Color.bpTextGhost)
                                .padding(.horizontal, 6).padding(.vertical, 3)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                        }
                    }
                    .listRowBackground(Color.bpSheet)
                }
                .listStyle(.plain)
                .background(Color.bpInk)
            }
        }
        .task {
            await workout.loadExercises()
            await workout.loadExerciseContext()
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateExerciseSheet { created in
                selected = created
                dismiss()
            }
        }
    }
}
