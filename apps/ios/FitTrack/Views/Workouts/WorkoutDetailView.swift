import SwiftUI

struct WorkoutDetailView: View {
    let workoutId: UUID
    let sessionNumber: Int

    @Environment(WorkoutViewModel.self) private var vm
    @Environment(\.dismiss) private var dismiss

    @AppStorage("settings_weightUnit") private var weightUnit: String = "kg"
    private var unitLabel: String { weightUnit == "lbs" ? "LBS" : "KG" }
    private func displayWeight(_ kg: Double) -> Double { weightUnit == "lbs" ? kg * 2.20462 : kg }
    private func toKg(_ shown: Double) -> Double { weightUnit == "lbs" ? shown / 2.20462 : shown }

    // Editing state (revision mode)
    @State private var isEditing = false
    @State private var saving = false
    @State private var drafts: [DraftGroup] = []
    @State private var showRename = false
    @State private var renameText = ""
    @State private var showDeleteConfirm = false

    // Live workout pulled from the VM so edits/reloads reflect immediately.
    private var workout: Workout? { vm.workouts.first { $0.id == workoutId } }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.35)

            if let workout {
                content(for: workout)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .dismissesKeyboardOnTap()
        .toolbar { toolbarContent }
        .alert("Rename session", isPresented: $showRename) {
            TextField("Session name", text: $renameText)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                let n = renameText.trimmingCharacters(in: .whitespaces)
                if !n.isEmpty { Task { await vm.renameWorkout(workoutId, name: n) } }
            }
        }
        .confirmationDialog(
            "Void this session? All sets are removed and records recalculate. This cannot be undone.",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Void session", role: .destructive) {
                Task { await vm.deleteWorkout(workoutId); dismiss() }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    // ── Main content ──────────────────────────────────────────────────
    private func content(for workout: Workout) -> some View {
        let sets = workout.workoutSets ?? []
        let groups = grouped(sets)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header(workout: workout, prCount: sets.filter(\.isPr).count)
                statsRow(groupCount: groups.count, setCount: sets.count,
                         totalReps: sets.reduce(0) { $0 + ($1.reps ?? 0) })

                if isEditing {
                    ForEach(drafts.indices, id: \.self) { gi in
                        EditableExerciseCard(group: $drafts[gi], unitLabel: unitLabel)
                            .padding(.horizontal, 20)
                    }
                } else if groups.isEmpty {
                    SheetCard {
                        Text("No sets on record for this session.")
                            .font(.blueprint(12))
                            .foregroundStyle(Color.bpTextGhost)
                            .frame(maxWidth: .infinity)
                            .padding(32)
                    }
                    .padding(.horizontal, 20)
                } else {
                    ForEach(groups) { group in
                        ExerciseDetailCard(group: group, unitLabel: unitLabel, displayWeight: displayWeight)
                            .padding(.horizontal, 20)
                    }
                }

                Spacer(minLength: 40)
            }
            .padding(.top, 20)
        }
    }

    private func header(workout: Workout, prCount: Int) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("SESSION \(String(format: "%03d", sessionNumber)) — \(workout.startedAt.formatted(.dateTime.weekday(.abbreviated)).uppercased()), \(workout.startedAt.formatted(.dateTime.month(.abbreviated).day()).uppercased())")
                    .figLabel(size: 10)
                HStack(spacing: 8) {
                    Text(workout.name ?? "Untitled Session")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                    if isEditing {
                        Text("— IN REVISION")
                            .font(.blueprint(10, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(Color.bpRedline)
                    }
                }
            }
            Spacer()
            if prCount > 0 && !isEditing {
                Stamp(text: "\(prCount) PR\(prCount > 1 ? "S" : "")")
            }
        }
        .padding(.horizontal, 20)
    }

    private func statsRow(groupCount: Int, setCount: Int, totalReps: Int) -> some View {
        SheetCard {
            HStack(spacing: 0) {
                StatCell(label: "EXERCISES", value: "\(groupCount)")
                Divider().frame(height: 32).background(Color.bpLine)
                StatCell(label: "SETS", value: "\(setCount)")
                Divider().frame(height: 32).background(Color.bpLine)
                StatCell(label: "REPS", value: "\(totalReps)")
            }
            .padding(16)
        }
        .padding(.horizontal, 20)
    }

    // ── Toolbar ───────────────────────────────────────────────────────
    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        if isEditing {
            ToolbarItem(placement: .topBarLeading) {
                Button("Cancel") { isEditing = false }
                    .disabled(saving)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(saving ? "Saving…" : "Save") { Task { await saveRevision() } }
                    .disabled(saving)
                    .foregroundStyle(Color.bpRedline)
            }
        } else {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { enterEdit() } label: { Label("Mark up sets", systemImage: "pencil") }
                    Button {
                        renameText = workout?.name ?? ""
                        showRename = true
                    } label: { Label("Rename session", systemImage: "textformat") }
                    Divider()
                    Button(role: .destructive) { showDeleteConfirm = true } label: {
                        Label("Void session", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(Color.bpTextPrimary)
                }
            }
        }
    }

    // ── Edit lifecycle ────────────────────────────────────────────────
    private func enterEdit() {
        drafts = grouped(workout?.workoutSets ?? []).map { g in
            DraftGroup(
                id: g.id,
                name: g.name,
                muscleGroup: g.muscleGroup,
                sets: g.sets.map { s in
                    DraftSet(
                        setId: s.id,
                        weight: s.weightKg.map { fmt(displayWeight($0)) } ?? "",
                        reps: s.reps.map(String.init) ?? ""
                    )
                }
            )
        }
        isEditing = true
    }

    private func saveRevision() async {
        guard let uid = workout?.userId else { isEditing = false; return }
        saving = true
        for group in drafts {
            var position = 0
            for s in group.sets {
                if s.toDelete {
                    if let sid = s.setId { await vm.deleteSet(sid) }
                    continue
                }
                guard let shown = Double(s.weight), let reps = Int(s.reps), reps > 0 else { continue }
                position += 1
                let kg = toKg(shown)
                if let sid = s.setId {
                    await vm.updateSet(sid, weightKg: kg, reps: reps, setNumber: position)
                } else {
                    await vm.addSet(workoutId: workoutId, exerciseId: group.id,
                                    weightKg: kg, reps: reps, setNumber: position)
                }
            }
        }
        await vm.loadWorkouts(userId: uid)   // refresh PR flags recomputed by triggers
        saving = false
        isEditing = false
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private func grouped(_ sets: [WorkoutSet]) -> [ExerciseGroup] {
        var order: [UUID] = []
        var map: [UUID: [WorkoutSet]] = [:]
        for s in sets {
            if map[s.exerciseId] == nil { order.append(s.exerciseId) }
            map[s.exerciseId, default: []].append(s)
        }
        return order.map { exId in
            let exSets = (map[exId] ?? []).sorted { $0.setNumber < $1.setNumber }
            let ex = exSets.first?.exercise
            return ExerciseGroup(id: exId, name: ex?.name ?? "Exercise",
                                 muscleGroup: ex?.muscleGroup ?? "", sets: exSets)
        }
    }

    private func fmt(_ v: Double) -> String {
        v.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", v) : String(format: "%.1f", v)
    }
}

// ── Grouping + draft models ───────────────────────────────────────────
fileprivate struct ExerciseGroup: Identifiable {
    let id: UUID
    let name: String
    let muscleGroup: String
    let sets: [WorkoutSet]
}

fileprivate struct DraftGroup: Identifiable {
    let id: UUID            // exerciseId
    let name: String
    let muscleGroup: String
    var sets: [DraftSet]
}

fileprivate struct DraftSet {
    var setId: UUID?        // nil = new, unsaved set
    var weight: String
    var reps: String
    var toDelete: Bool = false
}

// ── Read-only exercise card ───────────────────────────────────────────
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

// ── Editable exercise card (revision mode) ────────────────────────────
fileprivate struct EditableExerciseCard: View {
    @Binding var group: DraftGroup
    let unitLabel: String

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

                ForEach(group.sets.indices, id: \.self) { si in
                    if !group.sets[si].toDelete {
                        HStack(spacing: 8) {
                            Text("\(visibleNumber(si))")
                                .font(.blueprint(12))
                                .foregroundStyle(Color.bpTextGhost)
                                .frame(width: 18, alignment: .center)

                            BPTextField(placeholder: "0", text: $group.sets[si].weight)
                                .keyboardType(.decimalPad)
                                .frame(width: 74)
                            Text(unitLabel).font(.blueprint(10)).foregroundStyle(Color.bpTextGhost)
                            Text("×").font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                            BPTextField(placeholder: "0", text: $group.sets[si].reps)
                                .keyboardType(.numberPad)
                                .frame(width: 58)

                            Spacer()
                            Button { group.sets[si].toDelete = true } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.bpRedline)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                Button {
                    let last = group.sets.last { !$0.toDelete }
                    group.sets.append(DraftSet(setId: nil, weight: last?.weight ?? "", reps: last?.reps ?? ""))
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus").font(.system(size: 11, weight: .bold))
                        Text("ADD SET").font(.blueprint(11, weight: .semibold)).tracking(1)
                    }
                    .foregroundStyle(Color.bpPaper)
                    .padding(.vertical, 4)
                }
                .padding(.top, 2)
            }
            .padding(16)
        }
    }

    private func visibleNumber(_ idx: Int) -> Int {
        group.sets[0...idx].filter { !$0.toDelete }.count
    }
}
