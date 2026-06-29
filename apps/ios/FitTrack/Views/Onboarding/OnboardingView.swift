import SwiftUI

struct OnboardingView: View {
    @Environment(AuthViewModel.self)  private var auth
    @Environment(ProfileViewModel.self) private var profile

    @State private var step = 0

    // Step 0 — Identity
    @State private var name   = ""
    @State private var dob    = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var gender = ""

    // Step 1 — Biometrics (imperial entry; stored as cm/kg)
    @State private var heightFt    = "5"
    @State private var heightIn    = "9"
    @State private var weightKg    = ""

    // Step 2 — Programme
    @State private var activity = "moderately_active"
    @State private var goal     = "build_muscle"

    @State private var isSaving = false
    @State private var error: String?

    private let steps = ["01 IDENTITY", "02 BIOMETRICS", "03 PROGRAMME"]

    private var canAdvance: Bool {
        switch step {
        case 0: return !name.isEmpty && !gender.isEmpty
        case 1: return !heightFt.isEmpty && !weightKg.isEmpty
        default: return true
        }
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            DraftingGrid().ignoresSafeArea().opacity(0.4)

            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 6) {
                        Text("IRON BLUEPRINT").font(.blueprint(20, weight: .bold))
                            .foregroundStyle(Color.bpTextPrimary).tracking(8)
                        Text("NEW SESSION — COMPLETE YOUR SPEC SHEET")
                            .figLabel(size: 9)
                    }
                    .padding(.top, 48)

                    // Step indicator
                    HStack(spacing: 0) {
                        ForEach(steps.indices, id: \.self) { i in
                            HStack(spacing: 0) {
                                Text(steps[i])
                                    .font(.blueprint(9, weight: .medium))
                                    .tracking(1.2)
                                    .foregroundStyle(i == step ? Color.bpPaper : i < step ? Color.bpTextSecondary : Color.bpTextGhost)
                                    .underline(i == step, color: Color.bpPaper)
                                if i < steps.count - 1 {
                                    Spacer()
                                    Rectangle().fill(Color.bpLine).frame(height: 1).frame(maxWidth: .infinity)
                                    Spacer()
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 24)

                    // Card
                    SheetCard {
                        VStack(alignment: .leading, spacing: 20) {
                            // Card header
                            VStack(alignment: .leading, spacing: 4) {
                                Text(steps[step]).figLabel(size: 10)
                                Text(stepSubtitle).font(.blueprint(12)).foregroundStyle(Color.bpTextSecondary)
                            }
                            Divider().background(Color.bpLine)

                            stepContent

                            if let error {
                                Text("✕ \(error)").font(.blueprint(11)).foregroundStyle(Color.bpRedline)
                            }

                            Divider().background(Color.bpLine)

                            // Navigation
                            HStack(spacing: 10) {
                                if step > 0 {
                                    BPOutlineButton(title: "← BACK") { step -= 1 }
                                        .frame(width: 100)
                                }
                                BPButton(title: step < 2 ? "CONTINUE →" : "FILE & OPEN →",
                                         action: advance,
                                         isLoading: isSaving,
                                         isDisabled: !canAdvance)
                            }
                        }
                        .padding(24)
                    }
                    .padding(.horizontal, 24)

                    Spacer(minLength: 40)
                }
            }
        }
        .dismissesKeyboardOnTap()
    }

    private var stepSubtitle: String {
        switch step {
        case 0: return "Personal details for your drawing set"
        case 1: return "Body measurements — used for TDEE calculation"
        default: return "Training programme parameters"
        }
    }

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case 0:
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("DISPLAY NAME").figLabel(size: 9)
                    BPTextField(placeholder: "e.g. Alex Chen", text: $name)
                        .textContentType(.name)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("DATE OF BIRTH").figLabel(size: 9)
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
                VStack(alignment: .leading, spacing: 8) {
                    Text("SEX").figLabel(size: 9)
                    HStack(spacing: 8) {
                        BPChip(label: "MALE",   isActive: gender == "male")   { gender = "male" }
                        BPChip(label: "FEMALE", isActive: gender == "female") { gender = "female" }
                    }
                }
            }
        case 1:
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("HEIGHT").figLabel(size: 9)
                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("FT").figLabel(size: 8)
                            BPTextField(placeholder: "5", text: $heightFt)
                                .keyboardType(.numberPad)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("IN").figLabel(size: 8)
                            BPTextField(placeholder: "0", text: $heightIn)
                                .keyboardType(.numberPad)
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("WEIGHT (LBS)").figLabel(size: 9)
                    BPTextField(placeholder: "e.g. 176", text: $weightKg)
                        .keyboardType(.decimalPad)
                }
            }
        default:
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("GOAL").figLabel(size: 9)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach([("LOSE FAT", "lose_fat"), ("MAINTAIN", "maintain"),
                                 ("BUILD MUSCLE", "build_muscle"), ("PURE STRENGTH", "strength")], id: \.1) { label, value in
                            BPChip(label: label, isActive: goal == value) { goal = value }
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("ACTIVITY LEVEL").figLabel(size: 9)
                    ForEach([("SEDENTARY", "sedentary", "desk job"),
                             ("LIGHTLY ACTIVE", "lightly_active", "1–3 days"),
                             ("MODERATELY ACTIVE", "moderately_active", "3–5 days"),
                             ("VERY ACTIVE", "very_active", "6–7 days"),
                             ("EXTRA ACTIVE", "extra_active", "twice/day")], id: \.1) { label, value, note in
                        Button { activity = value } label: {
                            HStack {
                                Text(label).font(.blueprint(11)).foregroundStyle(activity == value ? Color.bpTextPrimary : Color.bpTextSecondary)
                                Spacer()
                                Text(note).font(.blueprint(10)).foregroundStyle(Color.bpTextGhost)
                            }
                            .padding(.horizontal, 12).padding(.vertical, 10)
                            .background(activity == value ? Color.bpPaper.opacity(0.08) : Color.clear)
                            .overlay(RoundedRectangle(cornerRadius: 2).stroke(activity == value ? Color.bpLineBright : Color.bpLine, lineWidth: 1))
                        }
                    }
                }
            }
        }
    }

    private static let dobFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private func advance() {
        if step < 2 { step += 1; return }
        isSaving = true
        error = nil
        Task {
            let ft = Double(heightFt) ?? 0
            let inch = Double(heightIn) ?? 0
            let hCm = ft * 30.48 + inch * 2.54
            let rawW = Double(weightKg) ?? 0
            let wKg = rawW / 2.20462
            let dobString = Self.dobFormatter.string(from: dob)
            do {
                guard let uid = auth.session?.user.id else { return }
                try await profile.save(
                    userId: uid,
                    name: name, dob: dobString, gender: gender,
                    heightCm: hCm > 0 ? hCm : nil,
                    weightKg: wKg > 0 ? wKg : nil,
                    activityLevel: activity, goal: goal
                )
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }
}
