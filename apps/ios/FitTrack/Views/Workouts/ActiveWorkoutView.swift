import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(ProfileViewModel.self) private var profile

    @State private var selectedExercise: Exercise?
    @State private var weightInput = ""
    @State private var repsInput   = ""
    @State private var showExercisePicker = false
    @State private var showVoidConfirm = false
    @State private var editingSet: WorkoutSet?
    @State private var exerciseToRemove: Exercise?
    @State private var showRemoveExerciseConfirm = false
    @Environment(\.dismiss) private var dismiss

    private let weightUnitLabel = "LBS"

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
                            SheetCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(group.exercise?.name ?? "Unknown")
                                            .font(.blueprint(12, weight: .semibold))
                                            .foregroundStyle(Color.bpTextPrimary)
                                        Spacer()
                                        if let ex = group.exercise {
                                            Button {
                                                exerciseToRemove = ex
                                                showRemoveExerciseConfirm = true
                                            } label: {
                                                Image(systemName: "trash")
                                                    .font(.system(size: 11))
                                                    .foregroundStyle(Color.bpRedline.opacity(0.8))
                                            }
                                        }
                                    }
                                    .padding(.bottom, 4)
                                    Divider().background(Color.bpLine)
                                    ForEach(group.sets) { set in
                                        HStack(spacing: 10) {
                                            Text("SET \(set.setNumber)")
                                                .font(.blueprint(10))
                                                .foregroundStyle(Color.bpTextGhost)
                                                .frame(width: 44, alignment: .leading)
                                            Text(setWeightLabel(set))
                                                .font(.blueprint(13))
                                                .foregroundStyle(Color.bpTextPrimary)
                                            Spacer()
                                            if set.isPr { Stamp(text: "PR").scaleEffect(0.8) }
                                            Button { editingSet = set } label: {
                                                Image(systemName: "pencil")
                                                    .font(.system(size: 12))
                                                    .foregroundStyle(Color.bpTextGhost)
                                                    .frame(width: 26, height: 26)
                                                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                                            }
                                            Button {
                                                Task { await workout.deleteActiveSet(set.id) }
                                            } label: {
                                                Image(systemName: "trash")
                                                    .font(.system(size: 12))
                                                    .foregroundStyle(Color.bpRedline.opacity(0.8))
                                                    .frame(width: 26, height: 26)
                                                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.4), lineWidth: 1))
                                            }
                                        }
                                    }
                                }
                                .padding(14)
                            }
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
            ExercisePickerSheet(selected: $selectedExercise)
        }
        .sheet(item: $editingSet) { set in
            EditSetSheet(set: set)
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
        Task { await workout.finishWorkout() }
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

// ── Exercise Picker Sheet ────────────────────────────────────────────
struct ExercisePickerSheet: View {
    @Binding var selected: Exercise?
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var showCreateSheet = false

    private var filtered: [Exercise] {
        if search.isEmpty { return workout.exercises }
        return workout.exercises.filter { $0.name.localizedCaseInsensitiveContains(search) }
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
        .task { await workout.loadExercises() }
        .sheet(isPresented: $showCreateSheet) {
            CreateExerciseSheet { created in
                selected = created
                dismiss()
            }
        }
    }
}
