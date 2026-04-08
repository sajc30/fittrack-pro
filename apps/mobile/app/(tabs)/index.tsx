import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Dumbbell, Flame, TrendingUp, Zap } from "lucide-react-native";

const C = {
  void:      "#080809",
  surface:   "#111114",
  raised:    "#18181C",
  inset:     "#050506",
  border:    "#1E1E24",
  amber:     "#F59E0B",
  amberDim:  "#78450A",
  amberGlow: "#FCD34D",
  text:      "#EBEBED",
  secondary: "#6B7280",
  ghost:     "#3A3A46",
  green:     "#16A34A",
};

const mockRecentPRs = [
  { exercise: "Bench Press", weight: "100 kg", date: "4 days ago" },
  { exercise: "Squat",       weight: "140 kg", date: "1 week ago" },
];

export default function WorkoutTab() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Zap size={14} color={C.void} strokeWidth={2.5} />
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* Start Workout CTA */}
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/workout/active")}
        >
          <View style={styles.startBtnInner}>
            <Dumbbell size={20} color={C.void} strokeWidth={2.5} />
            <Text style={styles.startBtnText}>Start Workout</Text>
          </View>
          <Text style={styles.startBtnSub}>Tap to begin a new session</Text>
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <View style={styles.statHeader}>
              <Flame size={14} color={C.amber} strokeWidth={2} />
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statSub}>days</Text>
          </View>

          <View style={[styles.statCard, { flex: 1 }]}>
            <View style={styles.statHeader}>
              <TrendingUp size={14} color={C.amber} strokeWidth={2} />
              <Text style={styles.statLabel}>THIS WEEK</Text>
            </View>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statSub}>sessions</Text>
          </View>
        </View>

        {/* Recent PRs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECENT PRS</Text>
          {mockRecentPRs.map((pr, i) => (
            <View key={i} style={styles.prRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <Text style={styles.prDate}>{pr.date}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.prWeight}>{pr.weight}</Text>
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EBEBED",
    letterSpacing: -0.3,
  },
  startBtn: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  startBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#080809",
    letterSpacing: -0.3,
  },
  startBtnSub: {
    fontSize: 12,
    color: "rgba(8,8,9,0.6)",
    fontWeight: "500",
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: "#111114",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E24",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#F59E0B",
    lineHeight: 44,
  },
  statSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  section: {
    backgroundColor: "#111114",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E24",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E1E24",
  },
  prExercise: { fontSize: 14, fontWeight: "500", color: "#EBEBED" },
  prDate: { fontSize: 11, color: "#3A3A46", marginTop: 2 },
  prWeight: { fontSize: 16, fontWeight: "700", color: "#EBEBED" },
  prBadge: {
    backgroundColor: "#78450A",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#F59E0B",
    letterSpacing: 1,
  },
});
