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
    @State private var elapsedSeconds = 0
    @State private var elapsedTask: Task<Void, Never>?
    @State private var weightUnit: String = "kg"

    private var weightUnitLabel: String { weightUnit == "lbs" ? "LBS" : "KG" }

    // Latest logged body weight wins over the profile field, mirroring the Body page.
    private var currentBodyweightDisplay: Double? {
        guard let kg = profile.measurements.first?.weightKg ?? profile.profile?.weightKg else { return nil }
        return weightUnit == "lbs" ? kg * 2.20462 : kg
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
                    VStack(alignment: .leading, spacing: 3) {
                        Text("ACTIVE SESSION").figLabel(size: 10)
                        Text(elapsedFormatted)
                            .font(.blueprint(20, weight: .semibold))
                            .foregroundStyle(Color.bpTextPrimary)
                    }
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
                                    Text(group.exercise?.name ?? "Unknown")
                                        .font(.blueprint(12, weight: .semibold))
                                        .foregroundStyle(Color.bpTextPrimary)
                                        .padding(.bottom, 4)
                                    Divider().background(Color.bpLine)
                                    ForEach(group.sets) { set in
                                        HStack {
                                            Text("SET \(set.setNumber)")
                                                .font(.blueprint(10))
                                                .foregroundStyle(Color.bpTextGhost)
                                                .frame(width: 44, alignment: .leading)
                                            Text(setWeightLabel(set))
                                                .font(.blueprint(13))
                                                .foregroundStyle(Color.bpTextPrimary)
                                            Spacer()
                                            if set.isPr { Stamp(text: "PR").scaleEffect(0.8) }
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
        .dismissesKeyboardOnTap()
        .confirmationDialog("VOID SESSION?", isPresented: $showVoidConfirm, titleVisibility: .visible) {
            Button("Void & Delete", role: .destructive) { voidWorkout() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This session will be permanently deleted and no sets will be saved.")
        }
        .onAppear {
            startElapsedTimer()
            weightUnit = UserDefaults.standard.string(forKey: "settings_weightUnit") ?? "kg"
        }
        .onChange(of: selectedExercise) { _, newValue in
            guard newValue?.equipment == "bodyweight", weightInput.isEmpty,
                  let bw = currentBodyweightDisplay else { return }
            weightInput = fmt(bw)
        }
        .onDisappear { elapsedTask?.cancel() }
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

    private var elapsedFormatted: String {
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }

    private func startElapsedTimer() {
        elapsedTask?.cancel()
        elapsedTask = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { break }
                elapsedSeconds += 1
            }
        }
    }

    private func setWeightLabel(_ set: WorkoutSet) -> String {
        guard let kg = set.weightKg else { return "— × \(set.reps ?? 0) reps" }
        let display = weightUnit == "lbs" ? kg * 2.20462 : kg
        let formatted = display.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", display)
            : String(format: "%.1f", display)
        return "\(formatted) \(weightUnitLabel) × \(set.reps ?? 0) reps"
    }

    private func logSet() {
        guard let ex = selectedExercise,
              let inputVal = Double(weightInput),
              let reps = Int(repsInput) else { return }
        let weightKg = weightUnit == "lbs" ? inputVal / 2.20462 : inputVal
        Task {
            await workout.logSet(exerciseId: ex.id, weight: weightKg, reps: reps)
            repsInput = ""
        }
    }

    private func finishWorkout() {
        elapsedTask?.cancel()
        Task { await workout.finishWorkout() }
    }

    private func voidWorkout() {
        elapsedTask?.cancel()
        Task { await workout.voidWorkout() }
    }
}

// ── Exercise Picker Sheet ────────────────────────────────────────────
struct ExercisePickerSheet: View {
    @Binding var selected: Exercise?
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

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
                    Text("INDEX — CHOOSE EXERCISE").figLabel(size: 10)
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
    }
}
