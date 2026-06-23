import SwiftUI
import Supabase

@MainActor
@Observable
final class ProfileViewModel {
    var profile: Profile?
    var measurements: [BodyMeasurement] = []
    var isLoading = false
    var error: String?
    var needsOnboarding = false

    func load(userId: UUID) async {
        isLoading = true
        error = nil
        do {
            let rows: [Profile] = try await supabase
                .from("profiles")
                .select()
                .eq("user_id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value
            if let p = rows.first {
                profile = p
                needsOnboarding = (p.heightCm == nil || p.weightKg == nil || p.dateOfBirth == nil)
            } else {
                needsOnboarding = true
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadMeasurements(userId: UUID) async {
        do {
            let m: [BodyMeasurement] = try await supabase
                .from("body_measurements")
                .select()
                .eq("user_id", value: userId.uuidString)
                .order("measured_at", ascending: false)
                .limit(30)
                .execute()
                .value
            measurements = m
        } catch {
            self.error = error.localizedDescription
        }
    }

    // Weight is a single timeline shared by Settings and the Body log — every new
    // entry, wherever it's added, becomes the profile's current weight too.
    private func setWeight(_ kg: Double, userId: UUID) async throws {
        let measurement: BodyMeasurement = try await supabase
            .from("body_measurements")
            .insert([
                "user_id": userId.uuidString,
                "weight_kg": String(kg),
                "measured_at": ISO8601DateFormatter().string(from: Date()),
            ])
            .select()
            .single()
            .execute()
            .value
        measurements.insert(measurement, at: 0)

        try await supabase
            .from("profiles")
            .update(["weight_kg": String(kg)])
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    func logWeight(_ kg: Double, userId: UUID) async throws {
        try await setWeight(kg, userId: userId)
        await load(userId: userId)
    }

    func save(userId: UUID, name: String, dob: String?, gender: String?,
              heightCm: Double?, weightKg: Double?, activityLevel: String?, goal: String?) async throws {
        var patch: [String: String] = ["name": name]
        if let v = dob          { patch["date_of_birth"]   = v }
        if let v = gender       { patch["gender"]           = v }
        if let v = heightCm     { patch["height_cm"]        = String(v) }
        if let v = activityLevel { patch["activity_level"]  = v }
        if let v = goal         { patch["goal"]             = v }

        try await supabase
            .from("profiles")
            .update(patch)
            .eq("user_id", value: userId.uuidString)
            .execute()

        let currentKnownWeightKg = measurements.first?.weightKg ?? profile?.weightKg
        if let weightKg, currentKnownWeightKg == nil || abs(weightKg - currentKnownWeightKg!) > 0.05 {
            try await setWeight(weightKg, userId: userId)
        }

        await load(userId: userId)
    }
}
