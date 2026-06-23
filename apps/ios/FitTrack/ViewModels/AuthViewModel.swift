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

    func deleteAccount() async throws {
        guard let token = session?.accessToken else {
            throw NSError(domain: "Auth", code: 401, userInfo: [NSLocalizedDescriptionKey: "No active session"])
        }

        var request = URLRequest(url: supabaseProjectURL.appendingPathComponent("functions/v1/delete-account"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let message = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
            throw NSError(domain: "Auth", code: 500, userInfo: [NSLocalizedDescriptionKey: message ?? "Failed to delete account"])
        }

        try await supabase.auth.signOut()
    }
}
