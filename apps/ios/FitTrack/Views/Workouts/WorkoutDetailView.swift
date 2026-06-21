import SwiftUI

struct WorkoutDetailView: View {
    let workout: Workout
    let sessionNumber: Int

    @AppStorage("settings_weightUnit") private var weightUnit: String = "kg"
    private var unitLabel: String { weightUnit == "lbs" ? "LBS" : "KG" }
    private func displayWeight(_ kg: Double) -> Double { weightUnit == "lbs" ? kg * 2.20462 : kg }

    private var sets: [WorkoutSet] { workout.workoutSets ?? [] }
    private var totalReps: Int {
        sets.reduce(0) { $0 + ($1.reps ?? 0) }
    }
    private var prCount: Int { sets.filter(\.isPr).count }

    private var groupedByExercise: [ExerciseGroup] {
        var order: [UUID] = []
        var map: [UUID: [WorkoutSet]] = [:]
        for s in sets {
            if map[s.exerciseId] == nil { order.append(s.exerciseId) }
            map[s.exerciseId, default: []].append(s)
        }
        return order.map { exId in
            let exSets = (map[exId] ?? []).sorted { $0.setNumber < $1.setNumber }
            let ex = exSets.first?.exercise
            return ExerciseGroup(id: exId, name: ex?.name ?? "Exercise", muscleGroup: ex?.muscleGroup ?? "", sets: exSets)
        }
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.35)

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    statsRow

                    if groupedByExercise.isEmpty {
                        SheetCard {
                            Text("No sets on record for this session.")
                                .font(.blueprint(12))
                                .foregroundStyle(Color.bpTextGhost)
                                .frame(maxWidth: .infinity)
                                .padding(32)
                        }
                        .padding(.horizontal, 20)
                    } else {
                        ForEach(groupedByExercise) { group in
                            ExerciseDetailCard(group: group, unitLabel: unitLabel, displayWeight: displayWeight)
                                .padding(.horizontal, 20)
                        }
                    }

                    Spacer(minLength: 40)
                }
                .padding(.top, 20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("SESSION \(String(format: "%03d", sessionNumber)) — \(workout.startedAt.formatted(.dateTime.weekday(.abbreviated)).uppercased()), \(workout.startedAt.formatted(.dateTime.month(.abbreviated).day()).uppercased())")
                    .figLabel(size: 10)
                Text(workout.name ?? "Untitled Session")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(Color.bpTextPrimary)
            }
            Spacer()
            if prCount > 0 {
                Stamp(text: "\(prCount) PR\(prCount > 1 ? "S" : "")")
            }
        }
        .padding(.horizontal, 20)
    }

    private var statsRow: some View {
        SheetCard {
            HStack(spacing: 0) {
                StatCell(label: "EXERCISES", value: "\(groupedByExercise.count)")
                Divider().frame(height: 32).background(Color.bpLine)
                StatCell(label: "SETS", value: "\(sets.count)")
                Divider().frame(height: 32).background(Color.bpLine)
                StatCell(label: "REPS", value: "\(totalReps)")
            }
            .padding(16)
        }
        .padding(.horizontal, 20)
    }
}

// ── Per-exercise grouping ─────────────────────────────────────────────
fileprivate struct ExerciseGroup: Identifiable {
    let id: UUID
    let name: String
    let muscleGroup: String
    let sets: [WorkoutSet]
}

// ── Exercise card with numbered sets ──────────────────────────────────
fileprivate struct ExerciseDetailCard: View {
    let group: ExerciseGroup
    let unitLabel: String
    let displayWeight: (Double) -> Double

    private var muscleGroupLabel: String {
        group.muscleGroup.replacingOccurrences(of: "_", with: " ").uppercased()
    }

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(group.name)
                        .font(.blueprint(14, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                    Text(muscleGroupLabel)
                        .figLabel(size: 9)
                }
                Divider().background(Color.bpLine)

                VStack(spacing: 0) {
                    ForEach(Array(group.sets.enumerated()), id: \.element.id) { i, s in
                        HStack(spacing: 12) {
                            Text("\(i + 1)")
                                .font(.blueprint(12))
                                .foregroundStyle(Color.bpTextGhost)
                                .frame(width: 18, alignment: .center)

                            HStack(spacing: 4) {
                                Text(s.weightKg != nil ? String(format: "%.1f", displayWeight(s.weightKg!)) : "—")
                                    .font(.blueprint(14))
                                    .foregroundStyle(Color.bpTextPrimary)
                                Text(unitLabel)
                                    .font(.blueprint(10))
                                    .foregroundStyle(Color.bpTextGhost)
                                Text("×").font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                                Text(s.reps != nil ? "\(s.reps!)" : "—")
                                    .font(.blueprint(14))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }

                            Spacer()
                            if s.isPr { Stamp(text: "PR") }
                        }
                        .padding(.vertical, 8)

                        if s.id != group.sets.last?.id {
                            Divider().background(Color.bpLine)
                        }
                    }
                }
            }
            .padding(16)
        }
    }
}
