import SwiftUI

struct ExercisesView: View {
    @Environment(WorkoutViewModel.self) private var workout

    @State private var search     = ""
    @State private var muscle     = "all"
    @State private var equipment  = "all"
    @State private var showCreateSheet = false

    private let muscleGroups = ["chest","back","shoulders","biceps","triceps",
                                "quadriceps","hamstrings","glutes","core","calves","full_body"]
    private let equipmentTypes = ["barbell","dumbbell","cable","machine","bodyweight","kettlebell","bands"]

    private var filtered: [Exercise] {
        workout.exercises.filter { ex in
            let muscleOK    = muscle == "all"    || ex.muscleGroup == muscle
            let equipOK     = equipment == "all" || ex.equipment   == equipment
            let searchOK    = search.isEmpty     || ex.name.localizedCaseInsensitiveContains(search)
            return muscleOK && equipOK && searchOK
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                VStack(spacing: 0) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("EXERCISES").figLabel(size: 10)
                                Text("Exercise Index")
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }
                            Spacer()
                            Button { showCreateSheet = true } label: {
                                Text("+ NEW")
                                    .font(.blueprint(11, weight: .semibold))
                                    .tracking(2)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(Color.bpPaper)
                                    .foregroundStyle(Color.bpInk)
                                    .clipShape(RoundedRectangle(cornerRadius: 2))
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        .padding(.bottom, 12)

                        // Search
                        BPTextField(placeholder: "Search index…", text: $search)
                            .padding(.horizontal, 20)

                        // Muscle filter
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                BPChip(label: "ALL", isActive: muscle == "all") { muscle = "all" }
                                ForEach(muscleGroups, id: \.self) { m in
                                    BPChip(label: m.replacingOccurrences(of: "_", with: " ").uppercased(),
                                           isActive: muscle == m) { muscle = muscle == m ? "all" : m }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.vertical, 8)

                        // Equipment filter
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                BPChip(label: "ALL", isActive: equipment == "all") { equipment = "all" }
                                ForEach(equipmentTypes, id: \.self) { e in
                                    BPChip(label: e.uppercased(), isActive: equipment == e) { equipment = equipment == e ? "all" : e }
                                }
                            }
                            .padding(.horizontal, 20)
                        }

                        // Count bar
                        HStack {
                            Text("\(filtered.count) ENTRIES").figLabel(size: 10)
                            Spacer()
                            if muscle != "all" || equipment != "all" || !search.isEmpty {
                                Button { search = ""; muscle = "all"; equipment = "all" } label: {
                                    Text("✕ CLEAR FILTERS").font(.blueprint(10)).foregroundStyle(Color.bpRedline)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 6)

                        Divider().background(Color.bpLineBright).padding(.horizontal, 20)

                        // Table header
                        HStack(spacing: 12) {
                            Text("NO.").figLabel(size: 9).frame(width: 32, alignment: .leading)
                            Text("EXERCISE").figLabel(size: 9).frame(maxWidth: .infinity, alignment: .leading)
                            Text("EQUIPMENT").figLabel(size: 9).frame(width: 84, alignment: .trailing)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 6)
                        .background(Color.bpSheetInset)

                        Divider().background(Color.bpLine)
                    }
                    .background(Color.bpInk)

                    // List
                    List(Array(filtered.enumerated()), id: \.element.id) { i, ex in
                        HStack(spacing: 12) {
                            Text(String(format: "%03d", i + 1))
                                .font(.blueprint(10))
                                .foregroundStyle(Color.bpTextGhost)
                                .frame(width: 32, alignment: .leading)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(ex.name)
                                    .font(.blueprint(13))
                                    .foregroundStyle(Color.bpTextPrimary)
                                Text(ex.muscleGroup.replacingOccurrences(of: "_", with: " ").uppercased())
                                    .font(.blueprint(9)).foregroundStyle(Color.bpTextSecondary).tracking(1)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)

                            Text(ex.equipment.uppercased())
                                .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost).tracking(1)
                                .padding(.horizontal, 6).padding(.vertical, 3)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                                .frame(width: 84, alignment: .trailing)
                        }
                        .listRowBackground(Color.bpSheet)
                        .listRowSeparatorTint(Color.bpLine)
                    }
                    .listStyle(.plain)
                    .background(Color.bpInk)
                }
            }
            .navigationBarHidden(true)
        }
        .task { await workout.loadExercises() }
        .sheet(isPresented: $showCreateSheet) {
            CreateExerciseSheet()
        }
    }
}
