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
                        // Leads the page: the only card here that says what to
                        // change today, rather than what already happened.
                        ReadyToProgressCard()
                            .padding(.horizontal, 20)
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
            await workout.loadExerciseContext()   // feeds the LAST SESSION cell
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
    @State private var showExercisePicker = false
    private let unitLabel = "LBS"
    private func displayWeight(_ kg: Double) -> Double { Units.toLbs(kg) }

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
                // Its own row: four cells across 402pt truncates both weight
                // values to "100.0 LBS ×…", which is worse than no cell at all.
                if let last = lastSession {
                    Divider().background(Color.bpLine)
                    HStack {
                        Text("LAST SESSION").figLabel(size: 9)
                        Spacer()
                        Text(last)
                            .font(.blueprint(12))
                            .foregroundStyle(Color.bpTextPrimary)
                    }
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
                let e1rm = estimateOneRepMax(kg: kg, reps: reps)
                if e1rm > bestE1rm { bestE1rm = e1rm; bestWeightKg = kg; bestReps = reps }
            }
        }
        return totalSets > 0 ? (totalSets, totalReps, bestWeightKg, bestReps) : nil
    }

    /// "65.0 LBS × 10 · 3 AUG" — the top set of the most recent session.
    /// Answers "what did I actually use last time" without reading the plot.
    private var lastSession: String? {
        guard let exId = selectedExerciseId,
              let ctx = workout.exerciseContext[exId],
              let sets = ctx.lastSets, !sets.isEmpty else { return nil }

        let top = sets.max { ($0.weightKg ?? 0) < ($1.weightKg ?? 0) }
        guard let kg = top?.weightKg, let reps = top?.reps else { return nil }

        let date = ctx.lastPerformedAt.formatted(.dateTime.month(.abbreviated).day()).uppercased()
        return "\(String(format: "%.1f", displayWeight(kg))) \(unitLabel) × \(reps) · \(date)"
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
                let e1rm = estimateOneRepMax(kg: kg, reps: reps)
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

/// Epley. Must stay identical to `estimateOneRepMax` in packages/shared and to
/// `recalc_personal_record` in 002_pr_integrity.sql — this plot is read against
/// PR values the database computed, so a different formula makes the chart
/// disagree with the PR stamp sitting next to it.
private func estimateOneRepMax(kg: Double, reps: Int) -> Double {
    reps == 1 ? kg : (kg * (1 + Double(reps) / 30)).rounded()
}

private struct E1rmChartContent: View {
    let data: [E1rmPoint]
    let displayWeight: (Double) -> Double
    private let unitLabel = "LBS"

    /// Drag-to-scrub via iOS 17's chartXSelection — no gesture plumbing — with
    /// content matching the web tooltip so both platforms read the same.
    ///
    /// Deliberately transient: the callout follows your finger and clears when
    /// you lift it. An earlier version pinned the last value, on the theory that
    /// the numbers sat under your thumb — but the annotation renders above the
    /// touch point, so they never did, and a callout that stays put with no way
    /// to dismiss reads as a bug. Tap-to-dismiss isn't an option either: the
    /// chart's own selection gesture consumes the tap and re-selects.
    @State private var scrubbedDate: Date?

    private var scrubbed: E1rmPoint? {
        guard let scrubbedDate else { return nil }
        return data.min { a, b in
            abs(a.date.timeIntervalSince(scrubbedDate)) < abs(b.date.timeIntervalSince(scrubbedDate))
        }
    }

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

                if let s = scrubbed, s.date == p.date {
                    RuleMark(x: .value("Date", s.date))
                        .foregroundStyle(Color.bpLineBright)
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                        // Fit on both axes: unconstrained, the callout escapes the
                        // plot and covers the exercise picker above it.
                        .annotation(position: .top, spacing: 2, overflowResolution: .init(x: .fit, y: .fit)) {
                            scrubCallout(s)
                        }
                }
            }
            .chartXSelection(value: $scrubbedDate)
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

    /// Mirrors the web's StrengthTooltip: the estimate, the set that produced
    /// it, the date, and a record stamp.
    @ViewBuilder
    private func scrubCallout(_ p: E1rmPoint) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(String(format: "%.0f", displayWeight(p.e1rm))) \(unitLabel)")
                .font(.blueprint(12, weight: .semibold))
                .foregroundStyle(Color.bpTextPrimary)
            Text("\(String(format: "%.1f", displayWeight(p.weightKg))) × \(p.reps)")
                .font(.blueprint(10))
                .foregroundStyle(Color.bpTextSecondary)
            Text(p.date.formatted(.dateTime.month(.abbreviated).day()).uppercased())
                .font(.blueprint(9))
                .foregroundStyle(Color.bpTextGhost)
            if p.isPR {
                Text("RECORD").font(.blueprint(9, weight: .semibold))
                    .tracking(1).foregroundStyle(Color.bpRedline)
            }
        }
        .padding(.horizontal, 8).padding(.vertical, 6)
        .background(Color.bpSheetRaised)
        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.bpLineBright, lineWidth: 1))
    }
}

// MARK: - Ready to progress

/// Double progression, surfaced. Mirrors the web card: leads with the exercises
/// that earned a load increase and collapses the rest, because the page should
/// answer "what do I change today" and for most lifts the answer is "nothing".
private struct ReadyToProgressCard: View {
    @Environment(WorkoutViewModel.self) private var workout
    @Environment(ProfileViewModel.self) private var profile
    @State private var showRest = false

    private var items: [WorkoutViewModel.ExerciseProgress] {
        workout.progression(repMin: profile.profile?.targetRepMin ?? 8,
                            repMax: profile.profile?.targetRepMax ?? 10)
    }

    private func lbs(_ kg: Double) -> String {
        String(format: "%.0f", Units.toLbs(kg))
    }

    var body: some View {
        let all = items
        let ready    = all.filter { $0.assessment.readiness == .addLoad }
        let holding  = all.filter { $0.assessment.readiness == .keepGoing }
        let building = all.filter { $0.assessment.readiness == .buildReps }

        if !all.isEmpty {
            SheetCard {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("READY TO PROGRESS").figLabel(size: 10)
                            Text("EVERY WORKING SET CLEARED YOUR REP RANGE")
                                .font(.blueprint(9)).foregroundStyle(Color.bpTextGhost)
                        }
                        Spacer()
                        Text("\(ready.count) OF \(all.count)")
                            .font(.blueprint(10)).foregroundStyle(Color.bpTextSecondary)
                    }

                    Divider().background(Color.bpLine)

                    if ready.isEmpty {
                        Text("Nothing due for a load increase — hold what you're on and keep pushing reps.")
                            .font(.blueprint(11)).foregroundStyle(Color.bpTextGhost)
                    } else {
                        ForEach(ready) { row($0, highlighted: true) }
                    }

                    if !holding.isEmpty || !building.isEmpty {
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) { showRest.toggle() }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: showRest ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 9))
                                Text("\(holding.count) HOLDING · \(building.count) BUILDING REPS")
                                    .font(.blueprint(9)).tracking(1)
                                Spacer()
                            }
                            .foregroundStyle(Color.bpTextGhost)
                            .frame(minHeight: 44) // thumb target, not a text link
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if showRest {
                            ForEach(holding + building) { row($0, highlighted: false) }
                        }
                    }
                }
                .padding(18)
            }
        }
    }

    @ViewBuilder
    private func row(_ item: WorkoutViewModel.ExerciseProgress, highlighted: Bool) -> some View {
        let a = item.assessment
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline) {
                Text(item.name)
                    .font(.blueprint(12))
                    .foregroundStyle(highlighted ? Color.bpTextPrimary : Color.bpTextSecondary)
                    .lineLimit(1)
                Spacer()
                if highlighted, let next = a.suggestedWeightKg {
                    Text("→ \(lbs(next)) LBS")
                        .font(.blueprint(12, weight: .semibold))
                        .foregroundStyle(Color.bpTextPrimary)
                }
            }
            Text("\(a.lowestReps ?? 0) reps at \(a.lastWeightKg.map(lbs) ?? "—") LBS · target \(a.range.min)–\(a.range.max)\(a.range.inferred ? " (from your history)" : "")")
                .font(.blueprint(9))
                .foregroundStyle(Color.bpTextGhost)
        }
        .padding(.vertical, 5)
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
                // Drops don't count — a dropset is one working set.
                count += (w.workoutSets ?? []).filter { $0.parentSetId == nil }.count
            }
            let label = weekStart.formatted(.dateTime.month(.abbreviated).day()).uppercased()
            result.append(WeekBar(label: label, count: Double(count), isCurrent: weeksAgo == 0))
        }
        return result
    }
}

// MARK: - FIG. 3 — Sets by muscle group, paged by calendar week

private struct MuscleGroupSetsCard: View {
    /// Commonly cited weekly set range per muscle group for hypertrophy. A
    /// reference band, deliberately not a target — training age, exercise
    /// selection and recovery all move it. Mirrors the web constant.
    static let band = (min: 10, max: 20)

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
            for s in w.workoutSets ?? [] where s.parentSetId == nil {
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
                        Text(weekRangeLabel + (isCurrentWeek ? " · THIS WEEK" : "")
                             + " · SHADED \(Self.band.min)–\(Self.band.max) REF")
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
                    // Fixed headroom above the band so a light week doesn't rescale
                    // the track and make 4 sets look like it fills the range. The
                    // band has to sit still to mean anything week to week.
                    let scaleMax = max(data.map(\.sets).max() ?? 1, Self.band.max + 2)
                    VStack(spacing: 8) {
                        ForEach(data, id: \.muscle) { row in
                            HStack(spacing: 10) {
                                Text(row.muscle.replacingOccurrences(of: "_", with: " ").uppercased())
                                    .figLabel(size: 9)
                                    .frame(width: 76, alignment: .leading)
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        // Commonly cited hypertrophy range. Shaded, not
                                        // colour-coded: a reference, not a grade.
                                        Rectangle()
                                            .fill(Color.bpLineBright.opacity(0.28))
                                            .frame(width: geo.size.width * CGFloat(Self.band.max - Self.band.min) / CGFloat(scaleMax))
                                            .offset(x: geo.size.width * CGFloat(Self.band.min) / CGFloat(scaleMax))
                                        RoundedRectangle(cornerRadius: 1)
                                            .fill(Color.bpPaper.opacity(0.85))
                                            .frame(width: geo.size.width * CGFloat(min(row.sets, scaleMax)) / CGFloat(scaleMax))
                                    }
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
