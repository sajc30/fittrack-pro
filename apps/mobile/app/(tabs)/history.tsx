import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell, Clock } from "lucide-react-native";

const C = {
  void: "#080809", surface: "#111114", border: "#1E1E24",
  amber: "#F59E0B", amberDim: "#78450A",
  text: "#EBEBED", secondary: "#6B7280", ghost: "#3A3A46",
};

const mockHistory = [
  { date: "Today",       name: "Push Day",          duration: "58 min", sets: 18, prs: 1 },
  { date: "Yesterday",   name: "Pull Day",           duration: "65 min", sets: 20, prs: 0 },
  { date: "Apr 5",       name: "Leg Day",            duration: "72 min", sets: 22, prs: 2 },
  { date: "Apr 3",       name: "Push Day",           duration: "54 min", sets: 17, prs: 0 },
  { date: "Apr 1",       name: "Full Body",          duration: "80 min", sets: 24, prs: 1 },
];

export default function HistoryTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>History</Text>

        {mockHistory.map((w, i) => (
          <TouchableOpacity key={i} style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>{w.date}</Text>
                <Text style={styles.workoutName}>{w.name}</Text>
              </View>
              {w.prs > 0 && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>
                    {w.prs} PR{w.prs > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Clock size={12} color={C.ghost} strokeWidth={2} />
                <Text style={styles.metaText}>{w.duration}</Text>
              </View>
              <View style={styles.metaItem}>
                <Dumbbell size={12} color={C.ghost} strokeWidth={2} />
                <Text style={styles.metaText}>{w.sets} sets</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#EBEBED", marginTop: 16, marginBottom: 16, letterSpacing: -0.4 },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  date: { fontSize: 11, fontWeight: "600", color: C.ghost, letterSpacing: 0.4, marginBottom: 3 },
  workoutName: { fontSize: 16, fontWeight: "600", color: C.text },
  prBadge: {
    backgroundColor: C.amberDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  prBadgeText: { fontSize: 11, fontWeight: "700", color: C.amber },
  cardMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: C.secondary },
});
