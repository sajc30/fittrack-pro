import SwiftUI

@main
struct FitTrackApp: App {
    @State private var auth    = AuthViewModel()
    @State private var workout = WorkoutViewModel()
    @State private var profile = ProfileViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(auth)
                .environment(workout)
                .environment(profile)
                .preferredColorScheme(.dark)
        }
    }
}
