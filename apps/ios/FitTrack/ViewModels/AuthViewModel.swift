import SwiftUI
import Supabase
import CryptoKit

// Custom URL scheme used for the Google OAuth (ASWebAuthenticationSession) redirect.
// Must match a CFBundleURLScheme in Info.plist and the redirect URL allow-list in Supabase Auth.
let oauthRedirectURL = URL(string: "com.sajandeepcheema.fittrack://auth-callback")!

/// Random nonce for Sign in with Apple. The raw value is sent to Supabase; its SHA256
/// hash is sent to Apple in the authorization request.
func randomNonceString(length: Int = 32) -> String {
    let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
    return String((0..<length).map { _ in charset.randomElement()! })
}

func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
}

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

    /// Native Sign in with Apple. The view obtains the identity token + raw nonce from
    /// `ASAuthorizationAppleIDCredential`; we exchange it for a Supabase session.
    func signInWithApple(idToken: String, nonce: String) async throws {
        try await supabase.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    /// Google sign-in via Supabase OAuth. supabase-swift drives an ASWebAuthenticationSession
    /// and returns to the app through `oauthRedirectURL`.
    func signInWithGoogle() async throws {
        try await supabase.auth.signInWithOAuth(provider: .google, redirectTo: oauthRedirectURL)
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
