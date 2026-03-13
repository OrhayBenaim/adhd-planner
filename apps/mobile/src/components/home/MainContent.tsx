// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

import { XPBar } from "../XPBar";
import { MoodSlider } from "../MoodSlider";
import { TaskCard } from "../TaskCard";
import { BottomNav } from "../BottomNav";
import { PointsToast } from "../PointsToast";
import { StreakBadge } from "../StreakBadge";
import { useHome } from "./HomeProvider";
import { useSheetFlow } from "./SheetFlowProvider";
import { usePremium } from "../../hooks/usePremium";
import { posthog } from "../../lib/posthog";

export function MainContent() {
  const {
    tasks,
    progress,
    moodLevel,
    setMoodLevel,
    selectedTask,
    setSelectedTask,
    toast,
    hideToast,
    completeTask,
    showToast,
    openSheet,
  } = useHome();
  const flow = useSheetFlow();
  const { isPremium } = usePremium();
  const streakData = useQuery(api.streaks.get);

  // AI button animation — local to this component
  const aiScale = useSharedValue(1);
  const aiRotate = useSharedValue(0);

  const handleAIPick = useCallback(() => {
    const now = new Date();
    const maxDaysAhead = 3; // Mirrors Convex env MAX_DUE_DATE_RANGE_DAYS

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + maxDaysAhead);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    const eligible = tasks
      .filter(
        (t) =>
          !t.completed &&
          t.difficulty >= 0 &&
          t.dueDate >= todayStr &&
          t.dueDate <= cutoffStr
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (!eligible.length) return;

    const ease = { duration: 300, easing: Easing.out(Easing.quad) };
    const settle = { duration: 400, easing: Easing.inOut(Easing.quad) };

    aiRotate.value = withSequence(
      withTiming(0.04, ease),
      withTiming(-0.04, ease),
      withTiming(0, settle)
    );
    aiScale.value = withSequence(
      withTiming(1.06, ease),
      withTiming(1, settle)
    );

    const best = eligible.reduce((prev, curr) =>
      Math.abs(curr.difficulty - moodLevel) < Math.abs(prev.difficulty - moodLevel)
        ? curr
        : prev
    );
    setTimeout(() => setSelectedTask(best), 500);
  }, [tasks, moodLevel, setSelectedTask, aiRotate, aiScale]);

  const handleComplete = useCallback(
    async (task: typeof selectedTask) => {
      if (!task) return;
      const result = await completeTask(task._id);
      posthog.capture("task_completed");
      setSelectedTask(null);
      showToast(result?.earned ?? 0);
    },
    [completeTask, setSelectedTask, showToast]
  );

  const aiAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: aiScale.value },
      { rotate: `${aiRotate.value}rad` },
    ],
  }));

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-8 pb-4 px-6">
          <Text className="text-2xl font-medium text-[#0a0a0a] text-center">How are you feeling?</Text>
          <Text className="text-sm text-[#6a7282] text-center mt-1">Let's find the perfect task for you</Text>
        </View>

        {/* XP bar */}
        <View className="py-6">
          <View className="relative">
            <XPBar progress={progress} />
            <PointsToast
              points={toast.points}
              visible={toast.visible}
              onDone={hideToast}
            />
          </View>
        </View>

        {/* Streak badge (premium) */}
        {isPremium && streakData && (
          <StreakBadge
            streak={streakData.currentStreak}
            onPress={() => openSheet("achievements")}
          />
        )}

        {/* Mood slider */}
        <View className="px-6 pt-2 pb-8">
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </View>

        {/* AI button */}
        <View className="items-center pb-6">
          <Animated.View style={aiAnimStyle}>
            <Pressable onPress={handleAIPick}>
              <View style={{ width: 154, height: 154, borderRadius: 77, backgroundColor: "#b9cbea", boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.1)" }}>
                <View style={{ width: 154, height: 154, borderRadius: 77, overflow: "hidden" }}>
                  <LinearGradient
                    colors={["#a2d2ff", "#cdb4db"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="sparkles-outline" size={58} color="#fff" />
                  </LinearGradient>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </View>

        {/* Task card */}
        <View className="px-6">
          <TaskCard
            task={selectedTask}
            onComplete={handleComplete}
            onLater={() => setSelectedTask(null)}
          />
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav
        onListPress={() => openSheet("allTasks")}
        onPreferencesPress={() => openSheet("preferences")}
        onAddPress={() => flow.start("addTask")}
        onSettingsPress={() => openSheet("settings")}
        onProfilePress={() => openSheet("profile")}
      />
    </View>
  );
}
