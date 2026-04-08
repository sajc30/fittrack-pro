import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-gifted-charts";
import { estimateOneRepMax } from "@fittrack/shared";
import { useState } from "react";

const C = {
  void: "#080809", surface: "#111114", raised: "#18181C",
  border: "#1E1E24", amber: "#F59E0B", amberDim: "#78450A",
  text: "#EBEBED", secondary: "#6B7280", ghost: "#3A3A46",
};

const DATA_SETS: Record<string, { value: number; date: string }[]> = {
  "Bench Press": [
    { value: estimateOneRepMax(95, 5),   date: "Jan" },
    { value: estimateOneRepMax(97.5, 5), date: "Feb" },
    { value: estimateOneRepMax(100, 4),  date: "Mar" },
    { value: estimateOneRepMax(100, 5),  date: "Apr" },
  ],
  "Squat": [
    { value: estimateOneRepMax(120, 5), date: "Jan" },
    { value: estimateOneRepMax(125, 5), date: "Feb" },
    { value: estimateOneRepMax(130, 5), date: "Mar" },
    { value: estimateOneRepMax(135, 4), date: "Apr" },
  ],
  "Deadlift": [
    { value: estimateOneRepMax(160, 3), date: "Jan" },
    { value: estimateOneRepMax(170, 3), date: "Feb" },
    { value: estimateOneRepMax(175, 2), date: "Mar" },
    { value: estimateOneRepMax(180, 1), date: "Apr" },
  ],
};

export default function ProgressTab() {
  const [selected, setSelected] = useState("Bench Press");
  const data = DATA_SETS[selected];
  const current = data[data.length - 1].value;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Progress</Text>

        {/* Exercise selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {Object.keys(DATA_SETS).map((ex) => (
            <TouchableOpacity
              key={ex}
              onPress={() => setSelected(ex)}
              style={[styles.chip, selected === ex && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected === ex && styles.chipTextActive]}>
                {ex}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>EST. 1RM — {selected.toUpperCase()}</Text>
          <View style={styles.e1rmRow}>
            <Text style={styles.e1rmValue}>{current}</Text>
            <Text style={styles.e1rmUnit}> kg</Text>
          </View>

          <LineChart
            data={data}
            color={C.amber}
            thickness={2.5}
            hideDataPoints={false}
            dataPointsColor={C.amber}
            dataPointsRadius={4}
            startFillColor={C.amberDim}
            startOpacity={0.3}
            endOpacity={0}
            areaChart
            backgroundColor={C.surface}
            yAxisColor="transparent"
            xAxisColor={C.border}
            yAxisTextStyle={{ color: C.ghost, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: C.ghost, fontSize: 10 }}
            noOfSections={4}
            height={140}
            curved
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#EBEBED", marginTop: 16, marginBottom: 16, letterSpacing: -0.4 },
  chipScroll: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.amber, borderColor: C.amber },
  chipText: { fontSize: 12, fontWeight: "600", color: C.secondary },
  chipTextActive: { color: C.void },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, color: C.ghost, marginBottom: 8 },
  e1rmRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16 },
  e1rmValue: { fontSize: 40, fontWeight: "700", color: C.amber, lineHeight: 44 },
  e1rmUnit: { fontSize: 16, fontWeight: "500", color: C.secondary, marginBottom: 5 },
});
