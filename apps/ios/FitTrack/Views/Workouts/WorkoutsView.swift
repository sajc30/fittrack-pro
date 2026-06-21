import SwiftUI

struct WorkoutsView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {

                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("WORKOUTS").figLabel(size: 10)
                                Text("Session Log")
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }
                            Spacer()
                            Button {
                                let name = String(format: "Session %03d", workout.workouts.count + 1)
                                Task { await workout.beginWorkout(userId: auth.session!.user.id, name: name) }
                            } label: {
                                Text("+ BEGIN")
                                    .font(.blueprint(11, weight: .semibold))
                                    .tracking(2)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .background(Color.bpPaper)
                                    .foregroundStyle(Color.bpInk)
                                    .clipShape(RoundedRectangle(cornerRadius: 2))
                            }
                        }
                        .padding(.horizontal, 20)

                        if workout.isLoading {
                            ForEach(0..<5, id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.bpSheet)
                                    .frame(height: 80)
                                    .padding(.horizontal, 20)
                                    .redacted(reason: .placeholder)
                            }
                        } else if workout.workouts.isEmpty {
                            SheetCard {
                                VStack(spacing: 8) {
                                    Text("NO SESSIONS ON FILE")
                                        .figLabel(size: 12)
                                    Text("Begin your first session to open drawing set 001.")
                                        .font(.blueprint(12))
                                        .foregroundStyle(Color.bpTextGhost)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(32)
                            }
                            .padding(.horizontal, 20)
                        } else {
                            ForEach(Array(workout.workouts.enumerated()), id: \.element.id) { i, w in
                                NavigationLink {
                                    WorkoutDetailView(workout: w, sessionNumber: workout.workouts.count - i)
                                } label: {
                                    SessionCard(workout: w, sessionNumber: workout.workouts.count - i)
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 20)
                            }
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationBarHidden(true)
        }
        .task {
            guard let uid = auth.session?.user.id else { return }
            await workout.loadWorkouts(userId: uid)
        }
    }
}

// ── Session Card ─────────────────────────────────────────────────────
struct SessionCard: View {
    let workout: Workout
    let sessionNumber: Int

    private var sets: [WorkoutSet] { workout.workoutSets ?? [] }
    private var exerciseCount: Int {
        Set(sets.map { $0.exerciseId }).count
    }
    private var totalReps: Int {
        sets.reduce(0) { $0 + ($1.reps ?? 0) }
    }
    private var hasPR: Bool { sets.contains { $0.isPr } }

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 12) {
                // Session header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SESSION \(String(format: "%03d", sessionNumber)) — \(workout.startedAt.formatted(.dateTime.weekday(.abbreviated)).uppercased()), \(workout.startedAt.formatted(.dateTime.month(.abbreviated).day()).uppercased())")
                            .figLabel(size: 9)
                        Text(workout.name ?? "Untitled Session")
                            .font(.blueprint(14, weight: .semibold))
                            .foregroundStyle(Color.bpTextPrimary)
                    }
                    Spacer()
                    if hasPR {
                        Stamp(text: "PR")
                    }
                }
                Divider().background(Color.bpLine)

                // Stats row
                HStack(spacing: 0) {
                    StatCell(label: "EXERCISES", value: "\(exerciseCount)")
                    Divider().frame(height: 32).background(Color.bpLine)
                    StatCell(label: "SETS", value: "\(sets.count)")
                    Divider().frame(height: 32).background(Color.bpLine)
                    StatCell(label: "REPS", value: "\(totalReps)")
                }
            }
            .padding(16)
        }
    }
}

struct StatCell: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(label).figLabel(size: 8)
            Text(value)
                .font(.blueprint(15, weight: .semibold))
                .foregroundStyle(Color.bpTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }
}
