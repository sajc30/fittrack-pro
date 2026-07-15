import SwiftUI
import Charts

struct DashboardView: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(ProfileViewModel.self) private var profile

    var latestWeight: Double? {
        profile.measurements.first?.weightKg
    }

    private var streak: Int {
        let workoutDates = workout.workouts.map { $0.startedAt }
        guard !workoutDates.isEmpty else { return 0 }
        let cal = Calendar.current
        let uniqueDays = Array(Set(workoutDates.map { cal.startOfDay(for: $0) }))
            .sorted().reversed().map { $0 }
        let today = cal.startOfDay(for: Date())
        let yesterday = cal.date(byAdding: .day, value: -1, to: today)!
        guard let first = uniqueDays.first, (first == today || first == yesterday) else { return 0 }
        var count = 1
        for i in 1..<uniqueDays.count {
            let diff = cal.dateComponents([.day], from: uniqueDays[i], to: uniqueDays[i - 1]).day ?? 0
            if diff == 1 { count += 1 } else { break }
        }
        return count
    }

    private var weeklySets: (thisWeek: Int, lastWeek: Int) {
        let cal = Calendar.current
        let now = Date()
        let weekStart = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
        let lastWeekStart = cal.date(byAdding: .weekOfYear, value: -1, to: weekStart)!
        var thisWeek = 0, lastWeek = 0
        for w in workout.workouts {
            for s in w.workoutSets ?? [] {
                if s.loggedAt >= weekStart { thisWeek += 1 }
                else if s.loggedAt >= lastWeekStart { lastWeek += 1 }
            }
        }
        return (thisWeek, lastWeek)
    }

    private func relativeDate(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date)     { return "TODAY" }
        if cal.isDateInYesterday(date) { return "YESTERDAY" }
        let days = cal.dateComponents([.day], from: date, to: Date()).day ?? 0
        if days < 7 { return "\(days)D AGO" }
        return date.formatted(.dateTime.month(.abbreviated).day()).uppercased()
    }

    @State private var showSettings = false
    @State private var showNamePrompt = false
    private let unitLabel = "LBS"
    private func displayWeight(_ kg: Double) -> Double { Units.toLbs(kg) }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {

                        // Page header
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("DASHBOARD").figLabel(size: 10)
                                Text(greeting)
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundStyle(Color.bpTextPrimary)
                            }
                            Spacer()
                            Button { showSettings = true } label: {
                                Image(systemName: "gearshape")
                                    .font(.system(size: 18))
                                    .foregroundStyle(Color.bpTextSecondary)
                            }
                            .padding(.top, 6)
                        }
                        .padding(.horizontal, 20)

                        // Begin session CTA
                        SheetCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("WORK ORDER — TODAY").figLabel(size: 10)
                                    Text(workout.isWorkoutActive ? "Session in progress" : "Ready to train?")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundStyle(Color.bpTextPrimary)
                                }
                                Spacer()
                                Button {
                                    if workout.isWorkoutActive {
                                        workout.showActiveSession = true
                                    } else {
                                        showNamePrompt = true
                                    }
                                } label: {
                                    Text(workout.isWorkoutActive ? "OPEN" : "+ BEGIN")
                                        .font(.blueprint(11, weight: .semibold))
                                        .tracking(2)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 10)
                                        .background(Color.bpPaper)
                                        .foregroundStyle(Color.bpInk)
                                        .clipShape(RoundedRectangle(cornerRadius: 2))
                                }
                            }
                            .padding(18)
                        }
                        .padding(.horizontal, 20)

                        // Streak + Weekly Volume side by side
                        let s = streak
                        let sets = weeklySets
                        HStack(alignment: .top, spacing: 12) {
                            // FIG. 1 — Streak
                            SheetCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("STREAK").figLabel(size: 10)
                                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                                        Text("\(s)")
                                            .font(.system(size: 30, weight: .semibold))
                                            .foregroundStyle(s > 0 ? Color.bpTextPrimary : Color.bpTextGhost)
                                        Text("DAYS").figLabel(size: 9)
                                    }
                                    HStack(spacing: 4) {
                                        ForEach(0..<7, id: \.self) { i in
                                            let filled = i >= 7 - min(s, 7)
                                            RoundedRectangle(cornerRadius: 1)
                                                .fill(filled ? Color.bpPaper.opacity(0.2) : Color.clear)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 1)
                                                        .stroke(
                                                            filled ? Color.bpPaper : Color.bpLine,
                                                            style: StrokeStyle(lineWidth: 1,
                                                                               dash: filled ? [] : [3, 2])
                                                        )
                                                )
                                                .frame(width: 20, height: 20)
                                        }
                                    }
                                    Text(s == 0 ? "NO ACTIVE STREAK" : "STREAK HOLDING")
                                        .figLabel(size: 8)
                                        .foregroundStyle(Color.bpTextGhost)
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            // FIG. 2 — Weekly Sets
                            SheetCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("SETS").figLabel(size: 10)
                                    if sets.thisWeek > 0 {
                                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                                            Text("\(sets.thisWeek)")
                                                .font(.system(size: 30, weight: .semibold))
                                                .foregroundStyle(Color.bpTextPrimary)
                                            Text("SETS").figLabel(size: 9)
                                        }
                                        let delta = sets.thisWeek - sets.lastWeek
                                        Text(sets.lastWeek == 0
                                             ? "FIRST WEEK"
                                             : "Δ \(delta >= 0 ? "+" : "")\(delta) VS LAST WK")
                                            .font(.blueprint(9))
                                            .foregroundStyle(
                                                sets.lastWeek == 0 ? Color.bpTextGhost
                                                : delta >= 0 ? Color.bpPaper : Color.bpRedline
                                            )
                                        Text("THIS WEEK").figLabel(size: 8).foregroundStyle(Color.bpTextGhost)
                                    } else {
                                        Text("No sets logged\nthis week.")
                                            .font(.blueprint(11))
                                            .foregroundStyle(Color.bpTextGhost)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .padding(.horizontal, 20)

                        // FIG. 3 — Recent PRs
                        if !workout.personalRecords.isEmpty {
                            SheetCard {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("RECENT RECORDS").figLabel(size: 10)
                                    Divider().background(Color.bpLine)
                                    ForEach(workout.personalRecords.prefix(4)) { pr in
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(pr.exercise?.name ?? "—")
                                                    .font(.blueprint(13))
                                                    .foregroundStyle(Color.bpTextPrimary)
                                                Text(pr.achievedAt.formatted(date: .abbreviated, time: .omitted).uppercased())
                                                    .figLabel(size: 9)
                                            }
                                            Spacer()
                                            VStack(alignment: .trailing, spacing: 2) {
                                                Text(String(format: "%.1f \(unitLabel) × \(pr.reps)", displayWeight(pr.weightKg)))
                                                    .font(.blueprint(12))
                                                    .foregroundStyle(Color.bpTextPrimary)
                                                Text(String(format: "E1RM %.0f \(unitLabel)", displayWeight(pr.e1rm)))
                                                    .figLabel(size: 9)
                                            }
                                        }
                                        if pr.id != workout.personalRecords.prefix(4).last?.id {
                                            Divider().background(Color.bpLine)
                                        }
                                    }
                                }
                                .padding(18)
                            }
                            .padding(.horizontal, 20)
                        }

                        // FIG. 4 — Bodyweight sparkline
                        if profile.measurements.count >= 2 {
                            SheetCard {
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        Text("BODYWEIGHT").figLabel(size: 10)
                                        Spacer()
                                        if let w = latestWeight {
                                            Text(String(format: "%.1f \(unitLabel)", displayWeight(w)))
                                                .font(.blueprint(12, weight: .semibold))
                                                .foregroundStyle(Color.bpTextPrimary)
                                        }
                                    }
                                    Divider().background(Color.bpLine)
                                    WeightSparkline(measurements: Array(profile.measurements.prefix(14)))
                                        .frame(height: 80)
                                }
                                .padding(18)
                            }
                            .padding(.horizontal, 20)
                        }

                        // Title block — At a glance
                        let workouts = workout.workouts
                        let latest = workouts.first
                        let thisMonth = workouts.filter {
                            Calendar.current.isDate($0.startedAt, equalTo: Date(), toGranularity: .month)
                        }.count
                        let total = workouts.count
                        let stats: [(String, String)] = [
                            ("LAST SESSION", latest.map { relativeDate($0.startedAt) } ?? "—"),
                            ("THIS MONTH",   "\(thisMonth) SESSION\(thisMonth != 1 ? "S" : "")"),
                            ("TOTAL LOGGED", total > 0 ? "\(total)" : "—"),
                            ("NEXT SHEET",   String(format: "SESSION %03d", total + 1)),
                        ]
                        SheetCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("TITLE BLOCK — AT A GLANCE").figLabel(size: 10)
                                Divider().background(Color.bpLine)
                                ForEach(stats, id: \.0) { label, value in
                                    HStack {
                                        Text(label).figLabel(size: 9)
                                        Spacer()
                                        Text(value)
                                            .font(.blueprint(11))
                                            .foregroundStyle(Color.bpTextPrimary)
                                    }
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
            .sheet(isPresented: $showSettings) { SettingsView() }
        }
        .task {
            guard let uid = auth.session?.user.id else { return }
            await workout.loadPRs(userId: uid)
            if workout.workouts.isEmpty { await workout.loadWorkouts(userId: uid) }
        }
        .beginSessionPrompt(isPresented: $showNamePrompt)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let name = profile.profile?.name?.components(separatedBy: " ").first ?? ""
        let prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
        return name.isEmpty ? prefix : "\(prefix), \(name)"
    }
}

// ── Weight Sparkline (SwiftUI Charts) ───────────────────────────────
struct WeightSparkline: View {
    let measurements: [BodyMeasurement]

    private var points: [(date: Date, weight: Double)] {
        measurements.compactMap { m in
            guard let w = m.weightKg else { return nil }
            return (m.measuredAt, w)
        }.reversed()
    }

    var body: some View {
        Chart(points, id: \.date) { p in
            LineMark(
                x: .value("Date", p.date),
                y: .value("Weight", p.weight)
            )
            .foregroundStyle(Color.bpPaper)
            .lineStyle(StrokeStyle(lineWidth: 1.5))

            PointMark(
                x: .value("Date", p.date),
                y: .value("Weight", p.weight)
            )
            .foregroundStyle(Color.bpPaper)
            .symbolSize(16)
        }
        .chartXAxis(.hidden)
        .chartYAxis {
            AxisMarks(position: .trailing) { _ in
                AxisValueLabel().font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
            }
        }
        .chartPlotStyle { plot in
            plot.background(Color.clear)
        }
    }
}
