import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(ProfileViewModel.self) private var profile

    var body: some View {
        Group {
            if auth.isLoading {
                ZStack {
                    Color.bpInk.ignoresSafeArea()
                    DraftingGrid().ignoresSafeArea().opacity(0.6)
                    VStack(spacing: 6) {
                        Text("FITTRACK")
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
    @State private var isWorkoutSheetPresented = false

    var body: some View {
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
        .sheet(isPresented: $isWorkoutSheetPresented) {
            ActiveWorkoutView()
                .interactiveDismissDisabled()
        }
        .onChange(of: workout.isWorkoutActive) { _, active in
            isWorkoutSheetPresented = active
        }
    }
}
