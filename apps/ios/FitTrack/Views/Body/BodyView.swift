import SwiftUI
import Charts

struct BodyView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(ProfileViewModel.self) private var profile
    @Environment(WorkoutViewModel.self) private var workout

    @State private var showLogWeight  = false
    @State private var weightInput    = ""
    @State private var imperialWeight = UserDefaults.standard.bool(forKey: "settings_imperialWeight")
    @State private var imperialHeight = UserDefaults.standard.bool(forKey: "settings_imperialHeight")
    @State private var isSaving       = false
    @State private var saveError: String?

    private var latestWeight: Double? { profile.measurements.first?.weightKg }

    private var muscleSetCount: [String: Int] {
        guard let weekAgo = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: Date()) else { return [:] }
        var result: [String: Int] = [:]
        for w in workout.workouts where w.startedAt >= weekAgo {
            for s in w.workoutSets ?? [] {
                guard let mg = s.exercise?.muscleGroup else { continue }
                result[mg, default: 0] += 1
            }
        }
        return result
    }

    private var weightUnit: String { imperialWeight ? "LBS" : "KG" }

    private func displayWeight(_ kg: Double) -> String {
        imperialWeight
            ? String(format: "%.1f", kg * 2.20462)
            : String(format: "%.1f", kg)
    }

    private func displayHeight(_ cm: Double) -> String {
        guard imperialHeight else { return String(format: "%.0f CM", cm) }
        let totalInches = cm / 2.54
        let ft = Int(totalInches / 12)
        let inches = Int(totalInches.truncatingRemainder(dividingBy: 12).rounded())
        return "\(ft)'\(inches)\""
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {

                        // Muscle activity map
                        MuscleMapView(setsPerMuscle: muscleSetCount)

                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("BODY").figLabel(size: 10)
                                Text("Measurements")
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }
                            Spacer()
                            Button { showLogWeight.toggle() } label: {
                                Text("+ LOG")
                                    .font(.blueprint(10, weight: .semibold))
                                    .tracking(2)
                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                    .foregroundStyle(Color.bpTextSecondary)
                                    .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                            }
                        }
                        .padding(.horizontal, 20)

                        // Log weight inline form
                        if showLogWeight {
                            SheetCard {
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        Text("NEW ENTRY — WEIGHT (\(weightUnit))").figLabel(size: 10)
                                        Spacer()
                                        Button {
                                            showLogWeight = false
                                            saveError = nil
                                            weightInput = ""
                                        } label: {
                                            Image(systemName: "xmark")
                                                .font(.system(size: 13))
                                                .foregroundStyle(Color.bpTextSecondary)
                                        }
                                    }
                                    HStack(spacing: 8) {
                                        BPChip(label: "KG",  isActive: !imperialWeight) { imperialWeight = false }
                                        BPChip(label: "LBS", isActive: imperialWeight)  { imperialWeight = true  }
                                    }
                                    HStack(spacing: 10) {
                                        BPTextField(
                                            placeholder: imperialWeight ? "e.g. 185.0" : "e.g. 84.0",
                                            text: $weightInput
                                        )
                                        .keyboardType(.decimalPad)
                                        BPButton(title: isSaving ? "FILING…" : "FILE",
                                                 action: logWeight,
                                                 isLoading: isSaving,
                                                 isDisabled: weightInput.isEmpty)
                                            .frame(width: 80)
                                    }
                                    if let err = saveError {
                                        Text("✕ \(err)").font(.blueprint(11)).foregroundStyle(Color.bpRedline)
                                    }
                                }
                                .padding(16)
                            }
                            .padding(.horizontal, 20)
                        }

                        // FIG. 1 Weight trend
                        SheetCard {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("WEIGHT TREND (\(weightUnit))").figLabel(size: 10)
                                        if let w = latestWeight {
                                            HStack(alignment: .lastTextBaseline, spacing: 4) {
                                                Text(displayWeight(w))
                                                    .font(.blueprint(28, weight: .semibold))
                                                    .foregroundStyle(Color.bpTextPrimary)
                                                Text(weightUnit.lowercased())
                                                    .font(.blueprint(13))
                                                    .foregroundStyle(Color.bpTextGhost)
                                            }
                                        }
                                    }
                                    Spacer()
                                }
                                Divider().background(Color.bpLine)

                                let points = weightPoints
                                if points.count < 2 {
                                    Text("Log twice to draw the trend.")
                                        .font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                                        .frame(maxWidth: .infinity).padding(.vertical, 30)
                                } else {
                                    Chart(points, id: \.date) { p in
                                        LineMark(x: .value("Date", p.date), y: .value("Weight", p.weight))
                                            .foregroundStyle(Color.bpPaper)
                                            .lineStyle(StrokeStyle(lineWidth: 1.5))
                                        PointMark(x: .value("Date", p.date), y: .value("Weight", p.weight))
                                            .foregroundStyle(Color.bpPaper).symbolSize(16)
                                    }
                                    .chartXAxis {
                                        AxisMarks { _ in
                                            AxisValueLabel().font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                                        }
                                    }
                                    .chartYAxis {
                                        AxisMarks(position: .trailing) { _ in
                                            AxisValueLabel().font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                                        }
                                    }
                                    .chartPlotStyle { $0.background(Color.clear) }
                                    .frame(height: 140)
                                }
                            }
                            .padding(18)
                        }
                        .padding(.horizontal, 20)

                        // FIG. 2 Body specs
                        SheetCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("BODY SPECS").figLabel(size: 10)
                                Divider().background(Color.bpLine)
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 0) {
                                    let p = profile.profile
                                    let displayW = (latestWeight ?? p?.weightKg)
                                        .map { "\(displayWeight($0)) \(weightUnit.lowercased())" } ?? "—"
                                    SpecCell(label: "HEIGHT",
                                             value: p?.heightCm.map { displayHeight($0) } ?? "—")
                                    SpecCell(label: "WEIGHT",   value: displayW)
                                    SpecCell(label: "ACTIVITY",
                                             value: p?.activityLevel?.replacingOccurrences(of: "_", with: " ").uppercased() ?? "—")
                                    SpecCell(label: "GOAL",
                                             value: p?.goal?.replacingOccurrences(of: "_", with: " ").uppercased() ?? "—")
                                }
                            }
                            .padding(18)
                        }
                        .padding(.horizontal, 20)

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationBarHidden(true)
        }
        .dismissesKeyboardOnTap()
        .onAppear {
            imperialWeight = UserDefaults.standard.bool(forKey: "settings_imperialWeight")
            imperialHeight = UserDefaults.standard.bool(forKey: "settings_imperialHeight")
        }
        .task {
            guard let uid = auth.session?.user.id else { return }
            if profile.measurements.isEmpty { await profile.loadMeasurements(userId: uid) }
            if workout.workouts.isEmpty { await workout.loadWorkouts(userId: uid) }
        }
    }

    private var weightPoints: [(date: Date, weight: Double)] {
        profile.measurements.prefix(30).compactMap { m in
            guard let w = m.weightKg else { return nil }
            return (m.measuredAt, imperialWeight ? w * 2.20462 : w)
        }.reversed()
    }

    private func logWeight() {
        guard let raw = Double(weightInput) else { return }
        let kg = imperialWeight ? raw / 2.20462 : raw
        isSaving = true
        saveError = nil
        Task {
            do {
                guard let uid = auth.session?.user.id else { return }
                try await profile.logWeight(kg, userId: uid)
                weightInput = ""
                showLogWeight = false
            } catch {
                saveError = error.localizedDescription
            }
            isSaving = false
        }
    }
}

struct SpecCell: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).figLabel(size: 8)
            Text(value).font(.blueprint(14, weight: .semibold)).foregroundStyle(Color.bpTextPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .overlay(Rectangle().stroke(Color.bpLine, lineWidth: 0.5))
    }
}
