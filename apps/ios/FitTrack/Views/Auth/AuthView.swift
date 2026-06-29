import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @State private var isSignUp = false

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.5)

            ScrollView {
                VStack(spacing: 32) {
                    // Wordmark
                    VStack(spacing: 6) {
                        Text("IRON BLUEPRINT")
                            .font(.blueprint(22, weight: .bold))
                            .foregroundStyle(Color.bpTextPrimary)
                            .tracking(8)
                        Text("PERSONAL TRAINING LOG")
                            .figLabel(size: 10)
                    }
                    .padding(.top, 60)

                    // Form card
                    SheetCard {
                        VStack(alignment: .leading, spacing: 20) {
                            // Card header
                            VStack(alignment: .leading, spacing: 4) {
                                Text(isSignUp ? "ACCESS — CREATE ACCOUNT" : "ACCESS — SIGN IN")
                                    .figLabel(size: 10)
                                Text(isSignUp ? "File a new drawing set." : "Enter credentials to open the drawing set.")
                                    .font(.blueprint(12))
                                    .foregroundStyle(Color.bpTextSecondary)
                            }
                            .padding(.bottom, 4)
                            Divider().background(Color.bpLine)

                            SocialAuthSection()

                            if isSignUp {
                                SignUpFormContent()
                            } else {
                                SignInFormContent()
                            }

                            // Toggle between sign-in / sign-up
                            HStack {
                                Spacer()
                                Button {
                                    withAnimation(.easeInOut(duration: 0.2)) { isSignUp.toggle() }
                                } label: {
                                    Text(isSignUp ? "Already have an account? Sign in" : "Don't have an account? Create one")
                                        .font(.blueprint(11))
                                        .foregroundStyle(Color.bpPaper)
                                }
                                Spacer()
                            }
                        }
                        .padding(24)
                    }
                    .padding(.horizontal, 24)

                    Spacer(minLength: 40)
                }
            }
        }
    }
}

// ── Sign In Form ─────────────────────────────────────────────────────
struct SignInFormContent: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var email    = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("EMAIL").figLabel(size: 9)
                BPTextField(placeholder: "you@example.com", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("PASSWORD").figLabel(size: 9)
                BPTextField(placeholder: "Password", text: $password, isSecure: true)
                    .textContentType(.password)
            }

            if let error {
                Text("✕ \(error)")
                    .font(.blueprint(11))
                    .foregroundStyle(Color.bpRedline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color.bpRedline.opacity(0.06))
                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.3), lineWidth: 1))
            }

            BPButton(title: "SIGN IN", action: signIn, isLoading: isLoading, isDisabled: email.isEmpty || password.isEmpty)
        }
    }

    private func signIn() {
        isLoading = true
        error = nil
        Task {
            do {
                try await auth.signIn(email: email, password: password)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// ── Sign Up Form ─────────────────────────────────────────────────────
struct SignUpFormContent: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var name     = ""
    @State private var email    = ""
    @State private var password = ""
    @State private var confirm  = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var success  = false

    var body: some View {
        VStack(spacing: 16) {
            if success {
                VStack(spacing: 8) {
                    Text("✓ ACCOUNT FILED")
                        .font(.blueprint(12, weight: .semibold))
                        .foregroundStyle(Color.green)
                    Text("Check your email to confirm, then sign in.")
                        .font(.blueprint(11))
                        .foregroundStyle(Color.bpTextSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 12)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("NAME").figLabel(size: 9)
                    BPTextField(placeholder: "e.g. Alex Chen", text: $name)
                        .textContentType(.name)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("EMAIL").figLabel(size: 9)
                    BPTextField(placeholder: "you@example.com", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("PASSWORD").figLabel(size: 9)
                    BPTextField(placeholder: "Min. 8 characters", text: $password, isSecure: true)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("CONFIRM PASSWORD").figLabel(size: 9)
                    BPTextField(placeholder: "Repeat password", text: $confirm, isSecure: true)
                }

                if let error {
                    Text("✕ \(error)")
                        .font(.blueprint(11))
                        .foregroundStyle(Color.bpRedline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color.bpRedline.opacity(0.06))
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.3), lineWidth: 1))
                }

                BPButton(title: "CREATE ACCOUNT", action: signUp, isLoading: isLoading,
                         isDisabled: name.isEmpty || email.isEmpty || password.count < 8 || password != confirm)
            }
        }
    }

    private func signUp() {
        guard password == confirm else { error = "Passwords do not match."; return }
        guard password.count >= 8  else { error = "Password must be at least 8 characters."; return }
        isLoading = true
        error = nil
        Task {
            do {
                try await auth.signUp(email: email, password: password, name: name)
                success = true
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// ── Social Sign-In (Apple + Google) ──────────────────────────────────
struct SocialAuthSection: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var appleNonce = ""
    @State private var googleLoading = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { request in
                let nonce = randomNonceString()
                appleNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = sha256(nonce)
            } onCompletion: { result in
                handleApple(result)
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 44)
            .clipShape(RoundedRectangle(cornerRadius: 2))

            Button(action: signInWithGoogle) {
                HStack(spacing: 8) {
                    if googleLoading {
                        ProgressView().tint(Color.bpInk)
                    } else {
                        Text("G").font(.system(size: 15, weight: .bold))
                    }
                    Text("CONTINUE WITH GOOGLE")
                        .font(.blueprint(12, weight: .semibold))
                        .tracking(1)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color.bpPaper)
                .foregroundStyle(Color.bpInk)
                .clipShape(RoundedRectangle(cornerRadius: 2))
            }
            .disabled(googleLoading)

            if let error {
                Text("✕ \(error)")
                    .font(.blueprint(11))
                    .foregroundStyle(Color.bpRedline)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: 10) {
                Rectangle().fill(Color.bpLine).frame(height: 1)
                Text("OR").figLabel(size: 9)
                Rectangle().fill(Color.bpLine).frame(height: 1)
            }
            .padding(.vertical, 2)
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authResult):
            guard let cred = authResult.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else {
                error = "Apple sign-in failed."
                return
            }
            Task {
                do { try await auth.signInWithApple(idToken: idToken, nonce: appleNonce) }
                catch { self.error = error.localizedDescription }
            }
        case .failure(let err):
            // Ignore user-cancelled; surface real errors.
            if (err as NSError).code != ASAuthorizationError.canceled.rawValue {
                error = err.localizedDescription
            }
        }
    }

    private func signInWithGoogle() {
        googleLoading = true
        error = nil
        Task {
            do { try await auth.signInWithGoogle() }
            catch { self.error = error.localizedDescription }
            googleLoading = false
        }
    }
}
