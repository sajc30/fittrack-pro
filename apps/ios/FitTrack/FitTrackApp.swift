import SwiftUI

@main
struct FitTrackApp: App {
    @State private var auth    = AuthViewModel()
    @State private var workout = WorkoutViewModel()
    @State private var profile = ProfileViewModel()

    init() {
        // The app is imperial-only (lbs + ft/in). The DB always stores kg/cm; this is
        // display/entry only. Locking the units here keeps web and iOS consistent and
        // lets us remove every unit toggle.
        UserDefaults.standard.set("lbs", forKey: "settings_weightUnit")
        UserDefaults.standard.set(true,  forKey: "settings_imperialWeight")
        UserDefaults.standard.set(true,  forKey: "settings_imperialHeight")
    }

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
