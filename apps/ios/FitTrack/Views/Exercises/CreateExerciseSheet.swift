import SwiftUI

/// Form for filing a custom exercise into the user's personal index.
/// Muscle/equipment lists here are the FULL Postgres enum value sets —
/// ExercisesView's filter arrays are intentionally truncated, don't reuse them.
struct CreateExerciseSheet: View {
    var onCreated: (Exercise) -> Void = { _ in }

    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var muscleGroup: String?
    @State private var secondaryMuscles: Set<String> = []
    @State private var equipment = "barbell"
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let muscleGroups = [
        "chest", "back", "shoulders", "biceps", "triceps", "forearms",
        "core", "quadriceps", "hamstrings", "glutes", "calves", "full_body", "cardio",
    ]
    private let equipmentTypes = [
        "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "bands", "other",
    ]

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && muscleGroup != nil && !isSaving
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            VStack(spacing: 0) {
                VStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.bpLine)
                        .frame(width: 36, height: 4)
                    Text("INDEX — NEW CUSTOM EXERCISE").figLabel(size: 10)
                }
                .padding(.top, 12)
                .padding(.bottom, 12)

                Divider().background(Color.bpLine)

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("Filed to your personal index only.")
                            .font(.blueprint(11))
                            .foregroundStyle(Color.bpTextGhost)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("EXERCISE NAME").figLabel(size: 8)
                            BPTextField(placeholder: "e.g. Landmine Press", text: $name)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("PRIMARY MUSCLE").figLabel(size: 8)
                            chipGrid(muscleGroups, isActive: { muscleGroup == $0 }) { mg in
                                muscleGroup = mg
                                secondaryMuscles.remove(mg)
                            }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("SECONDARY MUSCLES (OPTIONAL)").figLabel(size: 8)
                            chipGrid(muscleGroups.filter { $0 != muscleGroup },
                                     isActive: { secondaryMuscles.contains($0) }) { mg in
                                if secondaryMuscles.contains(mg) {
                                    secondaryMuscles.remove(mg)
                                } else {
                                    secondaryMuscles.insert(mg)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("EQUIPMENT").figLabel(size: 8)
                            chipGrid(equipmentTypes, isActive: { equipment == $0 }) { equipment = $0 }
                        }

                        if let message = errorMessage {
                            Text(message)
                                .font(.blueprint(11))
                                .foregroundStyle(Color.bpRedline)
                                .padding(10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.5), lineWidth: 1))
                        }

                        BPButton(title: isSaving ? "FILING…" : "FILE EXERCISE",
                                 action: save,
                                 isDisabled: !canSave)
                    }
                    .padding(20)
                }
            }
        }
        .dismissesKeyboardOnTap()
    }

    private func chipGrid(_ values: [String], isActive: @escaping (String) -> Bool,
                          onTap: @escaping (String) -> Void) -> some View {
        FlowChips(values: values, isActive: isActive, onTap: onTap)
    }

    private func save() {
        guard let uid = auth.session?.user.id, let mg = muscleGroup else { return }
        isSaving = true
        errorMessage = nil
        Task {
            let created = await workout.createExercise(
                userId: uid,
                name: name.trimmingCharacters(in: .whitespaces),
                muscleGroup: mg,
                secondaryMuscles: Array(secondaryMuscles),
                equipment: equipment
            )
            isSaving = false
            if let created {
                onCreated(created)
                dismiss()
            } else {
                errorMessage = workout.error ?? "Could not file the exercise — try again."
            }
        }
    }
}

// Wrapping chip layout for enum pickers. Sized for thumbs, not cursors:
// 2 columns, ≥48pt-tall targets, and enough gutter that neighbouring
// chips don't get mis-tapped.
private struct FlowChips: View {
    let values: [String]
    let isActive: (String) -> Bool
    let onTap: (String) -> Void

    private let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    var body: some View {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 10) {
            ForEach(values, id: \.self) { value in
                let active = isActive(value)
                Button { onTap(value) } label: {
                    HStack(spacing: 6) {
                        if active {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                        }
                        Text(value.replacingOccurrences(of: "_", with: " ").uppercased())
                            .font(.blueprint(12, weight: active ? .semibold : .regular))
                            .tracking(1.2)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(active ? Color.bpPaper : Color.bpSheetInset)
                    .foregroundStyle(active ? Color.bpInk : Color.bpTextSecondary)
                    .overlay(RoundedRectangle(cornerRadius: 2)
                        .stroke(active ? Color.bpPaper : Color.bpLine, lineWidth: 1))
                }
            }
        }
    }
}
