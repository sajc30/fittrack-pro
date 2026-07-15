import SwiftUI

/// Shared "New session" name prompt. Attach to any view whose button flips
/// `isPresented`; begins the workout with the entered (or default) name.
struct BeginSessionPrompt: ViewModifier {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout

    @Binding var isPresented: Bool
    @State private var sessionName = ""

    private var defaultSessionName: String {
        String(format: "Session %03d", workout.workouts.count + 1)
    }

    func body(content: Content) -> some View {
        content
            .onChange(of: isPresented) { _, showing in
                if showing { sessionName = defaultSessionName }
            }
            .alert("New session", isPresented: $isPresented) {
                TextField("Session name", text: $sessionName)
                Button("Cancel", role: .cancel) {}
                Button("Begin") {
                    let trimmed = sessionName.trimmingCharacters(in: .whitespaces)
                    let name = trimmed.isEmpty ? defaultSessionName : trimmed
                    guard let uid = auth.session?.user.id else { return }
                    Task { await workout.beginWorkout(userId: uid, name: name) }
                }
            } message: {
                Text("Name this session, or keep the default.")
            }
    }
}

extension View {
    func beginSessionPrompt(isPresented: Binding<Bool>) -> some View {
        modifier(BeginSessionPrompt(isPresented: isPresented))
    }
}
