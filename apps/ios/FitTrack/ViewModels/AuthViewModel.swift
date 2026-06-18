import SwiftUI
import Supabase

@MainActor
@Observable
final class AuthViewModel {
    var session: Session?
    var isLoading = true

    init() {
        Task { await listenToAuth() }
    }

    var isSignedIn: Bool { session != nil }

    private func listenToAuth() async {
        isLoading = true
        for await (event, session) in supabase.auth.authStateChanges {
            if [.initialSession, .signedIn, .signedOut].contains(event) {
                self.session = session
                self.isLoading = false
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String, name: String) async throws {
        try await supabase.auth.signUp(
            email: email,
            password: password,
            data: ["full_name": AnyJSON.string(name)]
        )
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }
}
