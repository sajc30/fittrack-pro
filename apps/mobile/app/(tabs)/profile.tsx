import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, ChevronRight } from "lucide-react-native";
import { ACTIVITY_LEVEL_LABELS } from "@fittrack/shared";

const C = {
  void: "#080809", surface: "#111114", border: "#1E1E24",
  amber: "#F59E0B", text: "#EBEBED", secondary: "#6B7280", ghost: "#3A3A46",
};

const profileItems = [
  { label: "Name",           value: "Your Name" },
  { label: "Height",         value: "178 cm" },
  { label: "Activity Level", value: "Moderately Active" },
  { label: "Goal",           value: "Build Muscle" },
];

export default function ProfileTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <User size={32} color={C.ghost} strokeWidth={1.5} />
          </View>
          <Text style={styles.avatarName}>Your Name</Text>
          <Text style={styles.avatarSub}>Member since Apr 2026</Text>
        </View>

        {/* Profile items */}
        <View style={styles.card}>
          {profileItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, i > 0 && styles.rowBorder]}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowValue}>{item.value}</Text>
              </View>
              <ChevronRight size={16} color={C.ghost} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#EBEBED", marginTop: 16, marginBottom: 24, letterSpacing: -0.4 },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#111114", borderWidth: 1, borderColor: "#1E1E24",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarName: { fontSize: 18, fontWeight: "700", color: "#EBEBED", marginBottom: 3 },
  avatarSub: { fontSize: 12, color: C.ghost },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", padding: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowLabel: { fontSize: 11, fontWeight: "600", color: C.ghost, letterSpacing: 0.4, marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: "500", color: C.text },
  signOut: {
    backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 12, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)",
  },
  signOutText: { fontSize: 14, fontWeight: "600", color: "#DC2626" },
});
