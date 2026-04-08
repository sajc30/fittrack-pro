import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { calculateTDEE } from "@fittrack/shared";

const C = {
  void: "#080809", surface: "#111114", inset: "#050506",
  border: "#1E1E24", amber: "#F59E0B", amberDim: "#78450A",
  text: "#EBEBED", secondary: "#6B7280", ghost: "#3A3A46",
  green: "#16A34A", blue: "#2563EB",
};

const tdee = calculateTDEE(80.4, 178, 26, "male", "moderately_active");

const measurements = [
  { label: "Chest",    value: "102 cm", change: "-1 cm", down: true },
  { label: "Waist",   value: "84 cm",  change: "-2 cm", down: true },
  { label: "Bicep",   value: "38 cm",  change: "+0.5 cm", down: false },
  { label: "Thigh",   value: "60 cm",  change: "-1.5 cm", down: true },
  { label: "Body Fat",value: "16%",    change: "-1%",   down: true },
];

export default function BodyTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Body</Text>

        {/* Weight */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CURRENT WEIGHT</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
            <Text style={styles.bigStat}>80.4</Text>
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>

        {/* TDEE */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardLabel}>CALORIE TARGETS</Text>
          <View style={styles.tdeeRow}>
            {[
              { label: "Cut",      value: tdee.cutting },
              { label: "Maintain", value: tdee.maintenance, highlight: true },
              { label: "Bulk",     value: tdee.bulking },
            ].map((t) => (
              <View
                key={t.label}
                style={[styles.tdeeCell, t.highlight && styles.tdeeCellActive]}
              >
                <Text style={[styles.tdeeCellLabel, t.highlight && { color: C.amber }]}>
                  {t.label.toUpperCase()}
                </Text>
                <Text style={[styles.tdeeCellValue, t.highlight && { color: C.amber }]}>
                  {t.value.toLocaleString()}
                </Text>
                <Text style={styles.tdeeCellUnit}>kcal</Text>
              </View>
            ))}
          </View>

          <View style={styles.macroRow}>
            {[
              { label: "Protein", value: `${tdee.protein_g}g`, color: C.amber },
              { label: "Carbs",   value: `${tdee.carbs_g}g`,   color: C.blue },
              { label: "Fat",     value: `${tdee.fat_g}g`,     color: C.green },
            ].map((m) => (
              <View key={m.label} style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroValue}>{m.value} </Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Measurements */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardLabel}>MEASUREMENTS</Text>
          <View style={styles.measureGrid}>
            {measurements.map((m) => (
              <View key={m.label} style={styles.measureCell}>
                <Text style={styles.measureLabel}>{m.label.toUpperCase()}</Text>
                <Text style={styles.measureValue}>{m.value}</Text>
                <Text
                  style={[
                    styles.measureChange,
                    { color: m.down ? C.green : "#DC2626" },
                  ]}
                >
                  {m.change}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#EBEBED", marginTop: 16, marginBottom: 16, letterSpacing: -0.4 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  cardLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, color: C.ghost, marginBottom: 10 },
  bigStat: { fontSize: 48, fontWeight: "700", color: C.text, lineHeight: 52 },
  unit: { fontSize: 18, fontWeight: "500", color: C.secondary, marginBottom: 6 },
  tdeeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tdeeCell: {
    flex: 1, alignItems: "center", backgroundColor: C.inset, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: C.border,
  },
  tdeeCellActive: { backgroundColor: C.amberDim, borderColor: C.amber },
  tdeeCellLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6, color: C.ghost, marginBottom: 4 },
  tdeeCellValue: { fontSize: 20, fontWeight: "700", color: C.text },
  tdeeCellUnit: { fontSize: 9, color: C.ghost, marginTop: 1 },
  macroRow: { flexDirection: "row", gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  macroItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  macroDot: { width: 6, height: 6, borderRadius: 3 },
  macroValue: { fontSize: 13, fontWeight: "700", color: C.text },
  macroLabel: { fontSize: 13, color: C.secondary },
  measureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  measureCell: {
    width: "47%", backgroundColor: C.inset, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  measureLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, color: C.ghost, marginBottom: 5 },
  measureValue: { fontSize: 18, fontWeight: "700", color: C.text },
  measureChange: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});
