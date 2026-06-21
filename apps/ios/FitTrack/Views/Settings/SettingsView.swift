import SwiftUI

struct SettingsView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(ProfileViewModel.self) private var profile
    @Environment(\.dismiss) private var dismiss

    @State private var name          = ""
    @State private var dob           = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var gender        = ""
    @State private var heightCm      = ""   // always cm
    @State private var heightFt      = "5"
    @State private var heightIn      = "9"
    @State private var weightKg      = ""   // always kg
    @State private var useImperialHeight = UserDefaults.standard.bool(forKey: "settings_imperialHeight")
    @State private var useImperialWeight = UserDefaults.standard.bool(forKey: "settings_imperialWeight")
    @State private var activityLevel = "moderately_active"
    @State private var goal          = "build_muscle"
    @State private var isSaving      = false
    @State private var saved         = false
    @State private var saveError: String?
    @State private var showSignOutConfirm = false

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
                                HStack {
                                    Spacer()
                                    BPChip(label: "CM", isActive: !useImperialHeight) {
                                        useImperialHeight = false
                                        UserDefaults.standard.set(false, forKey: "settings_imperialHeight")
                                    }
                                    BPChip(label: "FT·IN", isActive: useImperialHeight) {
                                        if !useImperialHeight, let cm = Double(heightCm) {
                                            let totalInches = cm / 2.54
                                            heightFt = String(Int(totalInches / 12))
                                            heightIn = String(Int(totalInches.truncatingRemainder(dividingBy: 12).rounded()))
                                        }
                                        useImperialHeight = true
                                        UserDefaults.standard.set(true, forKey: "settings_imperialHeight")
                                    }
                                }
                                if useImperialHeight {
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
                                } else {
                                    BPTextField(placeholder: "e.g. 180", text: $heightCm)
                                        .keyboardType(.decimalPad)
                                }
                            }
                            FieldBlock(label: "WEIGHT") {
                                HStack {
                                    Spacer()
                                    BPChip(label: "KG",  isActive: !useImperialWeight) {
                                        if useImperialWeight, let lbs = Double(weightKg) {
                                            weightKg = String(format: "%.1f", lbs / 2.20462)
                                        }
                                        useImperialWeight = false
                                        UserDefaults.standard.set(false, forKey: "settings_imperialWeight")
                                        UserDefaults.standard.set("kg", forKey: "settings_weightUnit")
                                    }
                                    BPChip(label: "LBS", isActive: useImperialWeight) {
                                        if !useImperialWeight, let kg = Double(weightKg) {
                                            weightKg = String(format: "%.1f", kg * 2.20462)
                                        }
                                        useImperialWeight = true
                                        UserDefaults.standard.set(true, forKey: "settings_imperialWeight")
                                        UserDefaults.standard.set("lbs", forKey: "settings_weightUnit")
                                    }
                                }
                                BPTextField(
                                    placeholder: useImperialWeight ? "e.g. 176" : "e.g. 80",
                                    text: $weightKg
                                )
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
                            Button { showSignOutConfirm = true } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 13))
                                    Text("SIGN OUT")
                                        .font(.blueprint(11, weight: .medium)).tracking(2)
                                }
                                .foregroundStyle(Color.bpRedline)
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpRedline.opacity(0.5), lineWidth: 1))
                            }
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationBarHidden(true)
        }
        .confirmationDialog("SIGN OUT?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) { Task { try? await auth.signOut() } }
            Button("Cancel", role: .cancel) {}
        }
        .onAppear {
            prefillFromProfile()
            UserDefaults.standard.set(useImperialWeight ? "lbs" : "kg", forKey: "settings_weightUnit")
        }
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
            weightKg = useImperialWeight
                ? String(format: "%.1f", w * 2.20462)
                : String(format: "%.1f", w)
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
                let wKg = useImperialWeight ? rawW / 2.20462 : rawW
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
