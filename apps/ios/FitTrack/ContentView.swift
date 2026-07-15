import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(ProfileViewModel.self) private var profile
    @Environment(WorkoutViewModel.self) private var workout

    var body: some View {
        Group {
            if auth.isLoading {
                ZStack {
                    Color.bpInk.ignoresSafeArea()
                    DraftingGrid().ignoresSafeArea().opacity(0.6)
                    VStack(spacing: 6) {
                        Text("IRON BLUEPRINT")
                            .font(.blueprint(24, weight: .bold))
                            .foregroundStyle(Color.bpTextPrimary)
                            .tracking(8)
                        Text("PERSONAL TRAINING LOG")
                            .figLabel(size: 10)
                    }
                }
            } else if !auth.isSignedIn {
                AuthView()
            } else if profile.needsOnboarding {
                OnboardingView()
                    .task {
                        guard let uid = auth.session?.user.id else { return }
                        await profile.load(userId: uid)
                    }
            } else {
                MainTabView()
                    .task {
                        guard let uid = auth.session?.user.id else { return }
                        await profile.load(userId: uid)
                        await profile.loadMeasurements(userId: uid)
                        // Resurface an unfinished session from a previous launch;
                        // the tab-bar banner offers the way back in.
                        await workout.restoreActiveSession(userId: uid)
                    }
            }
        }
        .animation(.easeInOut(duration: 0.25), value: auth.isSignedIn)
        .animation(.easeInOut(duration: 0.25), value: auth.isLoading)
    }
}

// ── Main Tab Navigation ──────────────────────────────────────────────
struct MainTabView: View {
    @Environment(WorkoutViewModel.self) private var workout

    var body: some View {
        @Bindable var workout = workout
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "square.grid.2x2") }

            WorkoutsView()
                .tabItem { Label("Workouts", systemImage: "list.bullet.clipboard") }

            ProgressView_()
                .tabItem { Label("Progress", systemImage: "chart.xyaxis.line") }

            BodyView()
                .tabItem { Label("Body", systemImage: "figure.stand") }

            ExercisesView()
                .tabItem { Label("Exercises", systemImage: "dumbbell") }
        }
        .tint(Color.bpPaper)
        .background(Color.bpInk)
        // Session-in-progress strip, floating above the tab bar on every tab.
        // Minimizing the sheet never ends the session — this brings it back.
        .overlay(alignment: .bottom) {
            if workout.isWorkoutActive && !workout.showActiveSession {
                ActiveSessionBanner { workout.showActiveSession = true }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 58)
            }
        }
        .sheet(isPresented: $workout.showActiveSession) {
            ActiveWorkoutView()
        }
    }
}

// ── Active session banner ────────────────────────────────────────────
struct ActiveSessionBanner: View {
    @Environment(WorkoutViewModel.self) private var workout
    let onTap: () -> Void

    @State private var pulsing = false

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.bpRedline)
                    .frame(width: 8, height: 8)
                    .opacity(pulsing ? 0.35 : 1)
                    .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: pulsing)

                VStack(alignment: .leading, spacing: 1) {
                    Text("SESSION IN PROGRESS")
                        .font(.blueprint(9, weight: .semibold))
                        .tracking(1.5)
                        .foregroundStyle(Color.bpRedline)
                    Text("\(workout.activeWorkout?.name ?? "Session") · \(workout.activeSets.count) set\(workout.activeSets.count == 1 ? "" : "s")")
                        .font(.blueprint(12, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                        .lineLimit(1)
                }
                Spacer()
                Text("RESUME")
                    .font(.blueprint(10, weight: .semibold))
                    .tracking(1.5)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.bpRedline)
                    .foregroundStyle(Color.bpInk)
                    .clipShape(RoundedRectangle(cornerRadius: 2))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.bpSheet)
            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.6), lineWidth: 1))
            .shadow(color: .black.opacity(0.4), radius: 10, y: 4)
        }
        .buttonStyle(.plain)
        .onAppear { pulsing = true }
    }
}
