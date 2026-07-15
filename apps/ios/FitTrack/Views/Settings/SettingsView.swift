import SwiftUI

struct SettingsView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(ProfileViewModel.self) private var profile
    @Environment(\.dismiss) private var dismiss

    @State private var name          = ""
    @State private var dob           = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var gender        = ""
    @State private var heightCm      = ""   // derived from ft/in, stored as cm
    @State private var heightFt      = "5"
    @State private var heightIn      = "9"
    @State private var weightKg      = ""   // entered as lbs, stored as kg
    @State private var activityLevel = "moderately_active"
    @State private var goal          = "build_muscle"
    @State private var isSaving      = false
    @State private var saved         = false
    @State private var saveError: String?
    @State private var showSignOutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var isDeletingAccount = false
    @State private var deleteAccountError: String?

    private static let dobFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private let activities: [(String, String)] = [
        ("SEDENTARY",         "sedentary"),
        ("LIGHTLY ACTIVE",    "lightly_active"),
        ("MODERATELY ACTIVE", "moderately_active"),
        ("VERY ACTIVE",       "very_active"),
        ("EXTRA ACTIVE",      "extra_active"),
    ]

    private let goals: [(String, String)] = [
        ("LOSE FAT",      "lose_fat"),
        ("MAINTAIN",      "maintain"),
        ("BUILD MUSCLE",  "build_muscle"),
        ("PURE STRENGTH", "strength"),
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {

                        // Header
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("SETTINGS").figLabel(size: 10)
                                Text("Configuration")
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }
                            Spacer()
                            Button { dismiss() } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 16))
                                    .foregroundStyle(Color.bpTextSecondary)
                            }
                            .padding(.top, 6)
                        }
                        .padding(.horizontal, 20)

                        // Spec A — Identity
                        SpecSection(fig: "SPEC A — IDENTITY") {
                            FieldBlock(label: "DISPLAY NAME") {
                                BPTextField(placeholder: "e.g. Alex Chen", text: $name)
                                    .textContentType(.name)
                            }
                            FieldBlock(label: "DATE OF BIRTH") {
                                DatePicker("", selection: $dob,
                                           in: Calendar.current.date(byAdding: .year, value: -100, to: Date())!...Date(),
                                           displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                                    .tint(Color.bpPaper)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.bpSheetInset)
                                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                            }
                            FieldBlock(label: "SEX") {
                                HStack(spacing: 8) {
                                    BPChip(label: "MALE",   isActive: gender == "male")   { gender = "male"   }
                                    BPChip(label: "FEMALE", isActive: gender == "female") { gender = "female" }
                                }
                            }
                        }

                        // Spec B — Biometrics
                        SpecSection(fig: "SPEC B — BIOMETRICS") {
                            FieldBlock(label: "HEIGHT") {
                                HStack(spacing: 8) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("FT").figLabel(size: 8)
                                        BPTextField(placeholder: "5", text: $heightFt)
                                            .keyboardType(.numberPad)
                                            .onChange(of: heightFt) { _, _ in syncHeightCm() }
                                    }
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("IN").figLabel(size: 8)
                                        BPTextField(placeholder: "0", text: $heightIn)
                                            .keyboardType(.numberPad)
                                            .onChange(of: heightIn) { _, _ in syncHeightCm() }
                                    }
                                }
                            }
                            FieldBlock(label: "WEIGHT (LBS)") {
                                BPTextField(placeholder: "e.g. 176", text: $weightKg)
                                    .keyboardType(.decimalPad)
                            }
                        }

                        // Spec C — Training
                        SpecSection(fig: "SPEC C — PROGRAMME") {
                            FieldBlock(label: "GOAL") {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                                    ForEach(goals, id: \.1) { label, value in
                                        BPChip(label: label, isActive: goal == value) { goal = value }
                                            .frame(maxWidth: .infinity)
                                    }
                                }
                            }
                            FieldBlock(label: "ACTIVITY LEVEL") {
                                VStack(spacing: 6) {
                                    ForEach(activities, id: \.1) { label, value in
                                        Button { activityLevel = value } label: {
                                            HStack {
                                                Text(label)
                                                    .font(.blueprint(11))
                                                    .foregroundStyle(activityLevel == value ? Color.bpTextPrimary : Color.bpTextSecondary)
                                                Spacer()
                                                if activityLevel == value {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 10))
                                                        .foregroundStyle(Color.bpPaper)
                                                }
                                            }
                                            .padding(.horizontal, 12).padding(.vertical, 10)
                                            .background(activityLevel == value ? Color.bpPaper.opacity(0.08) : Color.clear)
                                            .overlay(RoundedRectangle(cornerRadius: 2)
                                                .stroke(activityLevel == value ? Color.bpLineBright : Color.bpLine, lineWidth: 1))
                                        }
                                    }
                                }
                            }
                        }

                        if let err = saveError {
                            Text("✕ \(err)").font(.blueprint(11)).foregroundStyle(Color.bpRedline)
                                .padding(.horizontal, 20)
                        }

                        // Save button
                        BPButton(title: saved ? "✓ FILED" : "FILE CHANGES",
                                 action: saveProfile,
                                 isLoading: isSaving)
                        .padding(.horizontal, 20)

                        // Spec D — Account
                        SpecSection(fig: "SPEC D — ACCOUNT") {
                            VStack(alignment: .leading, spacing: 10) {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                    Button { showSignOutConfirm = true } label: {
                                        HStack(spacing: 8) {
                                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                                .font(.system(size: 13))
                                            Text("SIGN OUT")
                                                .font(.blueprint(11, weight: .medium)).tracking(2)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .foregroundStyle(Color.bpRedline)
                                        .padding(.vertical, 10)
                                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.5), lineWidth: 1))
                                    }

                                    Link(destination: URL(string: "https://fittrack-pro-web-nine.vercel.app/support")!) {
                                        Text("SUPPORT")
                                            .font(.blueprint(11, weight: .medium)).tracking(2)
                                            .frame(maxWidth: .infinity)
                                            .foregroundStyle(Color.bpTextSecondary)
                                            .padding(.vertical, 10)
                                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                                    }

                                    Link(destination: URL(string: "https://fittrack-pro-web-nine.vercel.app/privacy")!) {
                                        Text("PRIVACY")
                                            .font(.blueprint(11, weight: .medium)).tracking(2)
                                            .frame(maxWidth: .infinity)
                                            .foregroundStyle(Color.bpTextSecondary)
                                            .padding(.vertical, 10)
                                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                                    }

                                    Button { showDeleteConfirm = true } label: {
                                        Text("DELETE ACCOUNT")
                                            .font(.blueprint(11, weight: .medium)).tracking(2)
                                            .frame(maxWidth: .infinity)
                                            .foregroundStyle(Color.bpTextGhost)
                                            .padding(.vertical, 10)
                                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                                    }
                                }

                                if let deleteAccountError {
                                    Text("✕ \(deleteAccountError)")
                                        .font(.blueprint(11)).foregroundStyle(Color.bpRedline)
                                }
                            }
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationBarHidden(true)
        }
        .dismissesKeyboardOnTap()
        .confirmationDialog("SIGN OUT?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) { Task { try? await auth.signOut() } }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog(
            "Delete your account? Your profile, workouts, and all logged data are permanently erased. This cannot be undone.",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete Permanently", role: .destructive) {
                Task {
                    isDeletingAccount = true
                    deleteAccountError = nil
                    do {
                        try await auth.deleteAccount()
                    } catch {
                        deleteAccountError = error.localizedDescription
                    }
                    isDeletingAccount = false
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .onAppear { prefillFromProfile() }
        .onChange(of: profile.profile) { _, _ in prefillFromProfile() }
    }

    private func syncHeightCm() {
        let ft = Double(heightFt) ?? 0
        let i  = Double(heightIn)  ?? 0
        let cm = ft * 30.48 + i * 2.54
        if cm > 0 { heightCm = String(format: "%.1f", cm) }
    }

    private func prefillFromProfile() {
        guard let p = profile.profile else { return }
        name          = p.name ?? ""
        if let dobStr = p.dateOfBirth, let d = Self.dobFormatter.date(from: dobStr) { dob = d }
        gender        = p.gender ?? ""
        if let h = p.heightCm {
            heightCm = String(format: "%.1f", h)
            let totalInches = h / 2.54
            heightFt = String(Int(totalInches / 12))
            heightIn = String(Int(totalInches.truncatingRemainder(dividingBy: 12).rounded()))
        }
        if let w = p.weightKg {
            weightKg = String(format: "%.1f", w * 2.20462)
        }
        activityLevel = p.activityLevel ?? "moderately_active"
        goal          = p.goal ?? "build_muscle"
    }

    private func saveProfile() {
        isSaving = true
        saveError = nil
        Task {
            do {
                guard let uid = auth.session?.user.id else { return }
                let hCm = Double(heightCm) ?? 0
                let rawW = Double(weightKg) ?? 0
                let wKg = rawW / 2.20462
                try await profile.save(
                    userId: uid,
                    name: name,
                    dob: Self.dobFormatter.string(from: dob),
                    gender: gender.isEmpty ? nil : gender,
                    heightCm: hCm > 0 ? hCm : nil,
                    weightKg: wKg > 0 ? wKg : nil,
                    activityLevel: activityLevel,
                    goal: goal
                )
                saved = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { saved = false }
            } catch {
                saveError = error.localizedDescription
            }
            isSaving = false
        }
    }
}

// ── Layout helpers ───────────────────────────────────────────────────
struct SpecSection<Content: View>: View {
    let fig: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(fig).figLabel(size: 10)
                    Divider().background(Color.bpLine)
                }
                content()
            }
            .padding(18)
        }
        .padding(.horizontal, 20)
    }
}

struct FieldBlock<Content: View>: View {
    let label: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).figLabel(size: 9)
            content()
        }
    }
}
