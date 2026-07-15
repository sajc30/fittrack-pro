import SwiftUI

@main
struct FitTrackApp: App {
    @State private var auth    = AuthViewModel()
    @State private var workout = WorkoutViewModel()
    @State private var profile = ProfileViewModel()

    // The app is imperial-only (lbs + ft/in), hardcoded at every display/entry
    // site via Units in Models.swift. The DB always stores kg/cm.
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
