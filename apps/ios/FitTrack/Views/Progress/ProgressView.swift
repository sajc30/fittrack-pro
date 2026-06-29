import SwiftUI
import Charts

// MARK: - Range option

enum ProgressRangeOption: String, CaseIterable {
    case threeMonths = "3M"
    case sixMonths   = "6M"
    case oneYear     = "1Y"
    case all         = "ALL"
}

// MARK: - Root view (named ProgressView_ to avoid collision with SwiftUI.ProgressView)

struct ProgressView_: View {
    @Environment(AuthViewModel.self)    private var auth
    @Environment(WorkoutViewModel.self) private var workout

    @State private var selectedExerciseId: UUID?
    @State private var range: ProgressRangeOption = .threeMonths

    var body: some View {
        NavigationStack {
            ZStack {
                Color.bpInk.ignoresSafeArea()
                DraftingGrid().ignoresSafeArea().opacity(0.35)

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        pageHeader
                        StrengthCard(selectedExerciseId: $selectedExerciseId, range: $range)
                            .padding(.horizontal, 20)
                        WeeklySetsCard()
                            .padding(.horizontal, 20)
                        MuscleGroupSetsCard()
                            .padding(.horizontal, 20)
                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationBarHidden(true)
        }
        .task {
            guard let uid = auth.session?.user.id else { return }
            await workout.loadExercises()
            if workout.workouts.isEmpty { await workout.loadWorkouts(userId: uid) }
            selectFirstLoggedExercise()
        }
        .onChange(of: workout.workouts.count)  { _, _ in selectFirstLoggedExercise() }
        .onChange(of: workout.exercises.count) { _, _ in selectFirstLoggedExercise() }
    }

    private var pageHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("PROGRESS").figLabel(size: 10)
                Text("Analytics")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(Color.bpTextPrimary)
            }
            Spacer()
            Text("STRENGTH & SETS PLOTS").figLabel(size: 9)
        }
        .padding(.horizontal, 20)
    }

    private func selectFirstLoggedExercise() {
        guard selectedExerciseId == nil else { return }
        let loggedIds = Set(workout.workouts.flatMap { $0.workoutSets ?? [] }.map(\.exerciseId))
        selectedExerciseId = workout.exercises.first { loggedIds.contains($0.id) }?.id
    }
}

// MARK: - FIG. 1 — Strength card

private struct StrengthCard: View {
    @Environment(WorkoutViewModel.self) private var workout
    @Binding var selectedExerciseId: UUID?
    @Binding var range: ProgressRangeOption
    @AppStorage("settings_weightUnit") private var weightUnit: String = "kg"
    @State private var showExercisePicker = false
    private var unitLabel: String { weightUnit == "lbs" ? "LBS" : "KG" }
    private func displayWeight(_ kg: Double) -> Double { weightUnit == "lbs" ? kg * 2.20462 : kg }

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 12) {
                cardHeader
                Divider().background(Color.bpLine)
                cardContent
            }
            .padding(18)
        }
    }

    private var cardHeader: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                Text("STRENGTH (EST. 1RM, \(unitLabel))").figLabel(size: 10)
                HStack(spacing: 5) {
                    Text("BEST SET PER SESSION")
                        .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                    Text("·").font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                    Circle().fill(Color.bpRedline).frame(width: 5, height: 5)
                    Text("RECORD").font(.blueprint(9)).foregroundStyle(Color.bpRedline)
                }
            }
            Spacer()
            HStack(spacing: 4) {
                ForEach(ProgressRangeOption.allCases, id: \.self) { r in
                    BPChip(label: r.rawValue, isActive: range == r) { range = r }
                }
            }
        }
    }

    @ViewBuilder
    private var cardContent: some View {
        if workout.exercises.isEmpty {
            Text("Log a session to see strength trends.")
                .font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                .padding(.vertical, 8)
        } else {
            exercisePicker
            E1rmChartContent(data: e1rmData, displayWeight: displayWeight)
            if let stats = exerciseStats {
                Divider().background(Color.bpLine)
                HStack(spacing: 0) {
                    StatCell(label: "TOTAL SETS", value: "\(stats.totalSets)")
                    Divider().frame(height: 32).background(Color.bpLine)
                    StatCell(label: "TOTAL REPS", value: "\(stats.totalReps)")
                    Divider().frame(height: 32).background(Color.bpLine)
                    StatCell(label: "BEST SET", value: "\(String(format: "%.1f", displayWeight(stats.bestWeightKg))) \(unitLabel) × \(stats.bestReps)")
                }
            }
        }
    }

    private var exerciseStats: (totalSets: Int, totalReps: Int, bestWeightKg: Double, bestReps: Int)? {
        guard let exId = selectedExerciseId else { return nil }
        let cutoff = rangeDate
        var totalSets = 0, totalReps = 0
        var bestE1rm = 0.0, bestWeightKg = 0.0, bestReps = 0
        for w in workout.workouts {
            for s in w.workoutSets ?? [] where s.exerciseId == exId {
                guard let kg = s.weightKg, let reps = s.reps,
                      w.startedAt >= cutoff, reps > 0 else { continue }
                totalSets += 1
                totalReps += reps
                let e1rm = epley1RM(kg: kg, reps: reps)
                if e1rm > bestE1rm { bestE1rm = e1rm; bestWeightKg = kg; bestReps = reps }
            }
        }
        return totalSets > 0 ? (totalSets, totalReps, bestWeightKg, bestReps) : nil
    }

    private var loggedExercises: [Exercise] {
        let loggedIds = Set(workout.workouts.flatMap { $0.workoutSets ?? [] }.map(\.exerciseId))
        return workout.exercises.filter { loggedIds.contains($0.id) }
    }

    private var exercisePicker: some View {
        let selectedName = workout.exercises.first { $0.id == selectedExerciseId }?.name
        return Button { showExercisePicker = true } label: {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.bpTextGhost)
                Text(selectedName ?? "SEARCH EXERCISES")
                    .font(.blueprint(12))
                    .foregroundStyle(selectedName != nil ? Color.bpTextPrimary : Color.bpTextGhost)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.bpTextGhost)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(Color.bpSheetInset)
            .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
        }
        .sheet(isPresented: $showExercisePicker) {
            LoggedExercisePickerSheet(exercises: loggedExercises, selected: $selectedExerciseId)
        }
    }

    private var e1rmData: [E1rmPoint] {
        guard let exId = selectedExerciseId else { return [] }
        let cutoff = rangeDate
        var byDay: [TimeInterval: E1rmPoint] = [:]
        for w in workout.workouts {
            for s in w.workoutSets ?? [] where s.exerciseId == exId {
                guard let kg = s.weightKg, let reps = s.reps,
                      w.startedAt >= cutoff, reps > 0 else { continue }
                let e1rm = epley1RM(kg: kg, reps: reps)
                let day  = Calendar.current.startOfDay(for: w.startedAt)
                let key  = day.timeIntervalSince1970
                if let cur = byDay[key], cur.e1rm >= e1rm { continue }
                byDay[key] = E1rmPoint(date: day, e1rm: e1rm, isPR: s.isPr, weightKg: kg, reps: reps)
            }
        }
        return byDay.values.sorted { $0.date < $1.date }
    }

    private var rangeDate: Date {
        let cal = Calendar.current
        let now = Date()
        switch range {
        case .threeMonths: return cal.date(byAdding: .month, value: -3, to: now)!
        case .sixMonths:   return cal.date(byAdding: .month, value: -6, to: now)!
        case .oneYear:     return cal.date(byAdding: .year,  value: -1, to: now)!
        case .all:         return Date(timeIntervalSince1970: 0)
        }
    }
}

// Colloquial terms that span more than one muscle_group value (the raw enum
// value already covers "back", "chest", etc. via direct name matching).
private let muscleGroupSynonyms: [String: Set<String>] = [
    "legs": ["quadriceps", "hamstrings", "glutes", "calves"],
    "leg": ["quadriceps", "hamstrings", "glutes", "calves"],
    "arms": ["biceps", "triceps", "forearms"],
    "arm": ["biceps", "triceps", "forearms"],
    "abs": ["core"],
    "ab": ["core"],
    "butt": ["glutes"],
    "booty": ["glutes"],
]

private func exerciseMatches(_ ex: Exercise, query: String) -> Bool {
    let q = query.trimmingCharacters(in: .whitespaces).lowercased()
    guard !q.isEmpty else { return true }
    if ex.name.localizedCaseInsensitiveContains(q) { return true }

    let groupRaw = ex.muscleGroup.replacingOccurrences(of: "_", with: " ").lowercased()
    if groupRaw.contains(q) { return true }

    return muscleGroupSynonyms.contains { term, groups in
        (term.contains(q) || q.contains(term)) && groups.contains(ex.muscleGroup)
    }
}

// Type-to-filter exercise picker, scoped to exercises the user has actually logged.
// Matches name OR muscle group (including colloquial terms like "legs"/"arms").
private struct LoggedExercisePickerSheet: View {
    let exercises: [Exercise]
    @Binding var selected: UUID?
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var filtered: [Exercise] {
        if search.isEmpty { return exercises }
        return exercises.filter { exerciseMatches($0, query: search) }
    }

    var body: some View {
        ZStack {
            Color.bpInk.ignoresSafeArea()
            VStack(spacing: 0) {
                VStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.bpLine)
                        .frame(width: 36, height: 4)
                    Text("SEARCH LOGGED EXERCISES").figLabel(size: 10)
                    BPTextField(placeholder: "Search exercises…", text: $search)
                        .padding(.horizontal, 20)
                }
                .padding(.top, 12)
                .padding(.bottom, 12)

                Divider().background(Color.bpLine)

                if filtered.isEmpty {
                    Text("No logged exercises match \u{201c}\(search)\u{201d}.")
                        .font(.blueprint(12))
                        .foregroundStyle(Color.bpTextGhost)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                    Spacer()
                } else {
                    List(filtered) { ex in
                        Button {
                            selected = ex.id
                            dismiss()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(ex.name)
                                        .font(.blueprint(13))
                                        .foregroundStyle(ex.id == selected ? Color.bpPaper : Color.bpTextPrimary)
                                    Text(ex.muscleGroup.replacingOccurrences(of: "_", with: " ").uppercased())
                                        .figLabel(size: 9)
                                }
                                Spacer()
                            }
                        }
                        .listRowBackground(Color.bpSheet)
                    }
                    .listStyle(.plain)
                    .background(Color.bpInk)
                }
            }
        }
    }
}

struct E1rmPoint { let date: Date; let e1rm: Double; let isPR: Bool; let weightKg: Double; let reps: Int }

private func epley1RM(kg: Double, reps: Int) -> Double {
    kg / (1.0278 - 0.0278 * Double(reps))
}

private struct E1rmChartContent: View {
    let data: [E1rmPoint]
    let displayWeight: (Double) -> Double

    var body: some View {
        if data.count < 2 {
            Text("Two sessions needed to draw a trend.")
                .font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                .frame(maxWidth: .infinity).padding(.vertical, 40)
        } else {
            Chart(data, id: \.date) { p in
                LineMark(x: .value("Date", p.date), y: .value("E1RM", displayWeight(p.e1rm)))
                    .foregroundStyle(Color.bpPaper)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                PointMark(x: .value("Date", p.date), y: .value("E1RM", displayWeight(p.e1rm)))
                    .foregroundStyle(p.isPR ? Color.bpRedline : Color.bpPaper)
                    .symbolSize(p.isPR ? 36 : 16)
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
            .frame(height: 180)
        }
    }
}

// MARK: - FIG. 2 — Weekly sets card

private struct WeeklySetsCard: View {
    @Environment(WorkoutViewModel.self) private var workout

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("WEEKLY SETS").figLabel(size: 10)
                    Text("TOTAL SETS · 12-WEEK HISTORY")
                        .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                }
                Divider().background(Color.bpLine)
                setsContent
            }
            .padding(18)
        }
    }

    @ViewBuilder
    private var setsContent: some View {
        let setsData = weeklySetsData
        let maxCount = setsData.map(\.count).max() ?? 0
        if maxCount == 0 {
            Text("No sets on record yet.")
                .font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                .frame(maxWidth: .infinity).padding(.vertical, 40)
        } else {
            WeeklyBarChart(weeks: setsData, maxValue: maxCount)
                .frame(height: 170)
        }
    }

    private var weeklySetsData: [WeekBar] {
        let cal = Calendar.current
        let now = Date()
        var result: [WeekBar] = []
        for weeksAgo in stride(from: 11, through: 0, by: -1) {
            let ref       = cal.date(byAdding: .weekOfYear, value: -weeksAgo, to: now)!
            let comps     = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: ref)
            let weekStart = cal.date(from: comps)!
            let nextWeek  = cal.date(byAdding: .weekOfYear, value: 1, to: weekStart)!
            var count = 0
            for w in workout.workouts {
                guard w.startedAt >= weekStart && w.startedAt < nextWeek else { continue }
                count += (w.workoutSets ?? []).count
            }
            let label = weekStart.formatted(.dateTime.month(.abbreviated).day()).uppercased()
            result.append(WeekBar(label: label, count: Double(count), isCurrent: weeksAgo == 0))
        }
        return result
    }
}

// MARK: - FIG. 3 — Sets by muscle group, paged by calendar week

private struct MuscleGroupSetsCard: View {
    @Environment(WorkoutViewModel.self) private var workout
    // 0 = current week, increasing = further back. A rolling "last 7 days" window
    // would cut a calendar week in half depending on what day it is; paging by
    // actual Sun–Sat weeks gives a stable, comparable count.
    @State private var weekOffset = 0

    private var cal: Calendar { Calendar.current }

    private var weekStart: Date {
        let ref = cal.date(byAdding: .weekOfYear, value: -weekOffset, to: Date())!
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: ref)
        return cal.date(from: comps)!
    }
    private var weekEnd: Date { cal.date(byAdding: .weekOfYear, value: 1, to: weekStart)! }
    private var isCurrentWeek: Bool { weekOffset == 0 }

    private var muscleGroupData: [(muscle: String, sets: Int)] {
        var counts: [String: Int] = [:]
        for w in workout.workouts {
            guard w.startedAt >= weekStart, w.startedAt < weekEnd else { continue }
            for s in w.workoutSets ?? [] {
                guard let mg = s.exercise?.muscleGroup else { continue }
                counts[mg, default: 0] += 1
            }
        }
        return counts.map { ($0.key, $0.value) }.sorted { $0.1 > $1.1 }
    }

    private var weekRangeLabel: String {
        let start = weekStart.formatted(.dateTime.month(.abbreviated).day())
        let end = cal.date(byAdding: .day, value: 6, to: weekStart)!.formatted(.dateTime.month(.abbreviated).day())
        return "\(start) – \(end)".uppercased()
    }

    var body: some View {
        SheetCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("SETS BY MUSCLE GROUP").figLabel(size: 10)
                        Text(weekRangeLabel + (isCurrentWeek ? " · THIS WEEK" : ""))
                            .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                    }
                    Spacer()
                    HStack(spacing: 6) {
                        Button { weekOffset += 1 } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.bpTextSecondary)
                                .frame(width: 28, height: 28)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                        }
                        Button { weekOffset = max(0, weekOffset - 1) } label: {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(isCurrentWeek ? Color.bpTextGhost.opacity(0.4) : Color.bpTextSecondary)
                                .frame(width: 28, height: 28)
                                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLine, lineWidth: 1))
                        }
                        .disabled(isCurrentWeek)
                    }
                }
                Divider().background(Color.bpLine)

                let data = muscleGroupData
                if data.isEmpty {
                    Text(isCurrentWeek ? "No sets logged yet this week." : "No sets logged this week.")
                        .font(.blueprint(12)).foregroundStyle(Color.bpTextGhost)
                        .frame(maxWidth: .infinity).padding(.vertical, 24)
                } else {
                    let maxSets = data.map(\.sets).max() ?? 1
                    VStack(spacing: 8) {
                        ForEach(data, id: \.muscle) { row in
                            HStack(spacing: 10) {
                                Text(row.muscle.replacingOccurrences(of: "_", with: " ").uppercased())
                                    .figLabel(size: 9)
                                    .frame(width: 76, alignment: .leading)
                                GeometryReader { geo in
                                    RoundedRectangle(cornerRadius: 1)
                                        .fill(Color.bpPaper.opacity(0.85))
                                        .frame(width: geo.size.width * CGFloat(row.sets) / CGFloat(maxSets))
                                }
                                .frame(height: 18)
                                .background(Color.bpSheetInset)
                                Text("\(row.sets) SET\(row.sets != 1 ? "S" : "")")
                                    .font(.blueprint(11))
                                    .foregroundStyle(Color.bpTextPrimary)
                                    .frame(width: 52, alignment: .trailing)
                            }
                        }
                    }
                }
            }
            .padding(18)
        }
    }
}

// MARK: - Shared data types

struct WeekBar {
    let label: String
    let count: Double
    let isCurrent: Bool
}

// MARK: - FIG. 2 hatched bar chart

struct WeeklyBarChart: View {
    let weeks: [WeekBar]
    let maxValue: Double

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geo in
                let spacing: CGFloat = 3
                let barW = (geo.size.width - spacing * CGFloat(weeks.count - 1)) / CGFloat(weeks.count)
                let chartH = geo.size.height
                HStack(alignment: .bottom, spacing: spacing) {
                    ForEach(weeks.indices, id: \.self) { i in
                        SingleBar(d: weeks[i], fraction: maxValue > 0 ? CGFloat(weeks[i].count / maxValue) : 0, chartH: chartH)
                            .frame(width: barW)
                    }
                }
                .frame(height: chartH)
            }

            HStack(alignment: .top, spacing: 3) {
                ForEach(weeks.indices, id: \.self) { i in
                    let d = weeks[i]
                    let show = i % 3 == 0 || d.isCurrent
                    Text(show ? d.label : "")
                        .font(.blueprint(7))
                        .foregroundStyle(d.isCurrent ? Color.bpPaper : Color.bpTextGhost)
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }
            }
            .padding(.top, 6)
            .frame(height: 24)
        }
    }
}

private struct SingleBar: View {
    let d: WeekBar
    let fraction: CGFloat
    let chartH: CGFloat

    var body: some View {
        let barH = max(chartH * fraction, d.count > 0 ? 2 : 0)
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            Canvas { ctx, size in
                var x: CGFloat = -size.height
                while x < size.width + size.height {
                    var path = Path()
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x + size.height, y: size.height))
                    ctx.stroke(path, with: .color(Color.bpTextSecondary.opacity(0.5)), lineWidth: 1)
                    x += 4
                }
            }
            .frame(height: barH)
            .overlay(
                Rectangle().stroke(
                    d.isCurrent ? Color.bpPaper : Color.bpLineBright,
                    lineWidth: d.isCurrent ? 1.25 : 1
                )
            )
        }
    }
}
