import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, ChevronLeft, ChevronRight, Check, Clock } from "lucide-react-native";
import { estimateOneRepMax } from "@fittrack/shared";

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

interface LoggedSet {
  setNum: number;
  weight: string;
  reps: string;
  isPR: boolean;
}

const MOCK_EXERCISES = [
  { name: "Bench Press",        muscle: "CHEST",    previousSets: [{ weight: "97.5", reps: "5" }, { weight: "97.5", reps: "5" }, { weight: "97.5", reps: "4" }] },
  { name: "Incline DB Press",   muscle: "CHEST",    previousSets: [{ weight: "35", reps: "10" }, { weight: "35", reps: "9" }] },
  { name: "Cable Fly",          muscle: "CHEST",    previousSets: [{ weight: "22.5", reps: "12" }, { weight: "22.5", reps: "11" }] },
  { name: "Tricep Pushdown",    muscle: "TRICEPS",  previousSets: [{ weight: "30", reps: "12" }, { weight: "30", reps: "12" }] },
  { name: "Overhead Ext.",      muscle: "TRICEPS",  previousSets: [{ weight: "25", reps: "10" }, { weight: "25", reps: "10" }] },
];

const DEFAULT_REST = 90;

export default function ActiveWorkoutScreen() {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [weight, setWeight] = useState("100");
  const [reps, setReps] = useState("5");
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showPR, setShowPR] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Animation refs
  const prScale = useRef(new Animated.Value(0)).current;
  const prOpacity = useRef(new Animated.Value(0)).current;
  const restProgress = useRef(new Animated.Value(1)).current;
  const setSlide = useRef(new Animated.Value(0)).current;

  const exercise = MOCK_EXERCISES[exerciseIdx];
  const currentSetNum = loggedSets.filter(s => s.setNum > 0).length + 1;

  // Workout elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (!isResting || restSeconds <= 0) {
      if (restSeconds === 0 && isResting) {
        setIsResting(false);
      }
      return;
    }
    const t = setTimeout(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isResting, restSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const firePRAnimation = useCallback(() => {
    prScale.setValue(0.5);
    prOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(prScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }),
      Animated.timing(prOpacity, {
        toValue: 0,
        duration: 2500,
        delay: 1200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPR(false));
  }, [prScale, prOpacity]);

  const handleLogSet = useCallback(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;

    // Check if it's a PR (simplified — in production compare against Supabase PRs)
    const e1rm = estimateOneRepMax(w, r);
    const previousBestE1rm = estimateOneRepMax(97.5, 5); // mock
    const isPR = exerciseIdx === 0 && e1rm > previousBestE1rm;

    const newSet: LoggedSet = {
      setNum: currentSetNum,
      weight,
      reps,
      isPR,
    };

    // Slide in animation
    setSlide.setValue(40);
    Animated.timing(setSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setLoggedSets((prev) => [...prev, newSet]);

    if (isPR) {
      setShowPR(true);
      firePRAnimation();
    }

    // Start rest timer
    setRestSeconds(DEFAULT_REST);
    setIsResting(true);
    restProgress.setValue(1);
    Animated.timing(restProgress, {
      toValue: 0,
      duration: DEFAULT_REST * 1000,
      useNativeDriver: false,
    }).start();
  }, [weight, reps, currentSetNum, exerciseIdx, firePRAnimation, setSlide, restProgress]);

  const handleFinish = () => {
    Alert.alert(
      "Finish Workout",
      `Great session! ${loggedSets.length} sets logged in ${formatTime(elapsedSeconds)}.`,
      [
        { text: "Keep Going", style: "cancel" },
        { text: "Finish", style: "default", onPress: () => router.back() },
      ]
    );
  };

  const restPct = restSeconds / DEFAULT_REST;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }} edges={["top"]}>
      {/* Rest timer bar — 2px at top, always visible during workout */}
      <View style={styles.restBarTrack}>
        {isResting && (
          <Animated.View
            style={[
              styles.restBarFill,
              { width: `${restPct * 100}%` as any },
            ]}
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleFinish} style={styles.headerBtn}>
          <X size={18} color={C.secondary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.timerChip}>
          <Clock size={12} color={C.amber} strokeWidth={2} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.headerBtn}>
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise navigator */}
      <View style={styles.exerciseNav}>
        <TouchableOpacity
          onPress={() => setExerciseIdx((i) => Math.max(0, i - 1))}
          disabled={exerciseIdx === 0}
          style={{ opacity: exerciseIdx === 0 ? 0.2 : 1 }}
        >
          <ChevronLeft size={20} color={C.secondary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={styles.muscleChip}>{exercise.muscle}</Text>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseCounter}>
            {exerciseIdx + 1} / {MOCK_EXERCISES.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            setExerciseIdx((i) => Math.min(MOCK_EXERCISES.length - 1, i + 1))
          }
          disabled={exerciseIdx === MOCK_EXERCISES.length - 1}
          style={{ opacity: exerciseIdx === MOCK_EXERCISES.length - 1 ? 0.2 : 1 }}
        >
          <ChevronRight size={20} color={C.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Big input display — the core of the active workout screen */}
        <View style={styles.inputDisplay}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WEIGHT</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.bigInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                selectTextOnFocus
                cursorColor={C.amber}
              />
              <Text style={styles.inputUnit}>kg</Text>
            </View>
          </View>

          <Text style={styles.inputSeparator}>×</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REPS</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.bigInput}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                selectTextOnFocus
                cursorColor={C.amber}
              />
            </View>
          </View>
        </View>

        {/* Previous session reference */}
        {exercise.previousSets[currentSetNum - 1] && (
          <Text style={styles.prevRef}>
            Last: {exercise.previousSets[currentSetNum - 1].weight} kg ×{" "}
            {exercise.previousSets[currentSetNum - 1].reps}
          </Text>
        )}

        {/* PR badge overlay */}
        {showPR && (
          <Animated.View
            style={[
              styles.prBadge,
              { opacity: prOpacity, transform: [{ scale: prScale }] },
            ]}
          >
            <Text style={styles.prBadgeText}>NEW PR 🏆</Text>
          </Animated.View>
        )}

        {/* Logged sets this session */}
        {loggedSets.length > 0 && (
          <View style={styles.loggedSets}>
            <Text style={styles.loggedLabel}>THIS SESSION</Text>
            {loggedSets.map((set, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.loggedRow,
                  i === loggedSets.length - 1 && {
                    transform: [{ translateX: setSlide }],
                  },
                ]}
              >
                <Text style={styles.loggedSetNum}>Set {set.setNum}</Text>
                <Text style={styles.loggedSetValues}>
                  {set.weight} kg × {set.reps}
                </Text>
                {set.isPR ? (
                  <View style={styles.prMini}>
                    <Text style={styles.prMiniText}>PR</Text>
                  </View>
                ) : (
                  <Check size={14} color={C.green} strokeWidth={2.5} />
                )}
              </Animated.View>
            ))}
          </View>
        )}

        {/* Rest timer display */}
        {isResting && (
          <View style={styles.restChip}>
            <Clock size={12} color={C.amber} strokeWidth={2} />
            <Text style={styles.restChipText}>
              Rest: {formatTime(restSeconds)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Log Set button — full width at bottom, impossible to miss */}
      <View style={styles.logBtnWrapper}>
        <TouchableOpacity
          style={styles.logBtn}
          activeOpacity={0.85}
          onPress={handleLogSet}
        >
          <Text style={styles.logBtnText}>LOG SET {currentSetNum}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  restBarTrack: {
    height: 2,
    backgroundColor: C.border,
    width: "100%",
  },
  restBarFill: {
    height: 2,
    backgroundColor: C.amber,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: { padding: 4, minWidth: 48 },
  timerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  timerText: { fontSize: 13, fontWeight: "600", color: C.amber },
  finishText: { fontSize: 14, fontWeight: "600", color: C.secondary, textAlign: "right" },
  exerciseNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  muscleChip: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.amber,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  exerciseCounter: {
    fontSize: 11,
    color: C.ghost,
    marginTop: 2,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  inputDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputGroup: { alignItems: "center" },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.ghost,
    marginBottom: 6,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  bigInput: {
    fontSize: 64,
    fontWeight: "700",
    color: C.text,
    minWidth: 90,
    textAlign: "center",
    letterSpacing: -1,
    padding: 0,
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: "500",
    color: C.secondary,
    marginBottom: 8,
  },
  inputSeparator: {
    fontSize: 36,
    fontWeight: "300",
    color: C.ghost,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  prevRef: {
    textAlign: "center",
    fontSize: 13,
    color: C.ghost,
    marginBottom: 24,
  },
  prBadge: {
    alignSelf: "center",
    backgroundColor: C.amberDim,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.amber,
    marginBottom: 16,
  },
  prBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.amber,
    letterSpacing: 1,
  },
  loggedSets: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  loggedLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: C.ghost,
    marginBottom: 10,
  },
  loggedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  loggedSetNum: { fontSize: 12, color: C.secondary, width: 50 },
  loggedSetValues: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  prMini: {
    backgroundColor: C.amberDim,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prMiniText: { fontSize: 9, fontWeight: "700", color: C.amber, letterSpacing: 0.8 },
  restChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.amber,
  },
  restChipText: { fontSize: 13, fontWeight: "600", color: C.amber },
  logBtnWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.void,
  },
  logBtn: {
    backgroundColor: C.amber,
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.void,
    letterSpacing: 0.5,
  },
});
