// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AiCeilingBanner } from "../AiCeilingBanner";
import { useHome } from "./HomeProvider";
import { useSheetNav } from "./SheetNavProvider";
import { useTaskCreationFlow } from "./TaskCreationFlowProvider";
import { usePremium } from "../../hooks/usePremium";
import { posthog } from "../../lib/posthog";
import { getLocalToday, getLocalDateStringDaysAhead } from "../../lib/dateTimeConvert";
import { useHomeTour, HomeTourIntro, HomeTourOverlays } from "./HomeTour";

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
  } = useHome();
  const { openSheet } = useSheetNav();
  const flow = useTaskCreationFlow();
  const homeTour = useHomeTour();
  const { refs: tourRefs, tourLayouts, tryHandleAIPick, notifyTaskCompleted, handleAddPress } =
    homeTour;

  const { isPremium, showPaywall } = usePremium();
  const streakData = useQuery(api.streaks.get);
  const ceilingStatus = useQuery(api.ai.getCeilingStatus);
  const creditBalance = useQuery(api.credits.getMyBalance);
  const aiPickDaysAhead = useQuery(api.appConfig.getPublic, { key: "aiPickDaysAhead" }) ?? 7;

  // Debounce: only show banner if tasks have had difficulty === -1 for >5 minutes
  const hasUnscoredTasks = useMemo(
    () => tasks.some((t) => !t.completed && t.difficulty === -1),
    [tasks],
  );
  const [showUnscoredBanner, setShowUnscoredBanner] = useState(false);
  const unscoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasUnscoredTasks) {
      if (unscoredTimerRef.current) clearTimeout(unscoredTimerRef.current);
      unscoredTimerRef.current = null;
      setShowUnscoredBanner(false);
      return;
    }
    unscoredTimerRef.current = setTimeout(() => {
      setShowUnscoredBanner(true);
    }, 5 * 60 * 1000);
    return () => {
      if (unscoredTimerRef.current) clearTimeout(unscoredTimerRef.current);
    };
  }, [hasUnscoredTasks]);

  const showCeilingBanner = ceilingStatus?.atCeiling === true || showUnscoredBanner;

  // AI button animation — local to this component
  const aiScale = useSharedValue(1);
  const aiRotate = useSharedValue(0);

  // "No tasks" toast
  const [noTasksMsg, setNoTasksMsg] = useState<string | null>(null);
  const noTasksOpacity = useSharedValue(0);
  const noTasksTranslateY = useSharedValue(0);
  const noTasksAnimStyle = useAnimatedStyle(() => ({
    opacity: noTasksOpacity.value,
    transform: [{ translateY: noTasksTranslateY.value }],
  }));

  const handleAIPick = useCallback(() => {
    if (tryHandleAIPick(tasks, setSelectedTask)) return;

    const todayStr = getLocalToday();
    const cutoffStr = getLocalDateStringDaysAhead(aiPickDaysAhead);

    const eligible = tasks
      .filter(
        (t) =>
          !t.completed &&
          t.difficulty >= 0 &&
          t.dueDate >= todayStr &&
          t.dueDate <= cutoffStr,
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const ease = { duration: 300, easing: Easing.out(Easing.quad) };
    const settle = { duration: 400, easing: Easing.inOut(Easing.quad) };

    aiRotate.value = withSequence(
      withTiming(0.04, ease),
      withTiming(-0.04, ease),
      withTiming(0, settle),
    );
    aiScale.value = withSequence(withTiming(1.06, ease), withTiming(1, settle));

    if (!eligible.length) {
      setNoTasksMsg(`No tasks in the next ${aiPickDaysAhead} day${aiPickDaysAhead === 1 ? "" : "s"}`);
      noTasksTranslateY.value = 0;
      noTasksOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 300 }),
      );
      noTasksTranslateY.value = withTiming(-30, { duration: 2500 });
      return;
    }

    const best = eligible.reduce((prev, curr) =>
      Math.abs(curr.difficulty - moodLevel) <
      Math.abs(prev.difficulty - moodLevel)
        ? curr
        : prev,
    );
    setTimeout(() => setSelectedTask(best), 500);
  }, [tryHandleAIPick, tasks, moodLevel, setSelectedTask, aiRotate, aiScale, aiPickDaysAhead, noTasksOpacity, noTasksTranslateY]);

  const handleComplete = useCallback(
    async (task: typeof selectedTask) => {
      if (!task) return;
      const result = await completeTask(task._id);
      posthog.capture("task_completed");
      setSelectedTask(null);
      showToast(result?.earned ?? 0);
      notifyTaskCompleted();
    },
    [notifyTaskCompleted, completeTask, setSelectedTask, showToast],
  );

  const aiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aiScale.value }, { rotate: `${aiRotate.value}rad` }],
  }));

  return (
    <View ref={tourRefs.rootViewRef} collapsable={false} className="flex-1 bg-[#f5f7fa]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-8 pb-4 px-6">
          <Text className="text-2xl font-medium text-[#0a0a0a] text-center">
            How are you feeling?
          </Text>
          <Text className="text-sm text-[#6a7282] text-center mt-1">
            Let's find the perfect task for you
          </Text>
        </View>

        {/* Streak badge (premium) */}
        {isPremium && streakData && (
          <StreakBadge
            streak={streakData.currentStreak}
          />
        )}

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

        {/* Mood slider */}
        <View ref={tourRefs.moodSliderRef} className="px-6 pt-2 pb-8">
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </View>

        {/* AI button */}
        <View ref={tourRefs.aiButtonRef} className="items-center pb-6">
          <Animated.View style={aiAnimStyle}>
            <Pressable onPress={handleAIPick}>
              <View
                style={{
                  width: 154,
                  height: 154,
                  borderRadius: 77,
                  backgroundColor: "#b9cbea",
                  boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.1)",
                }}
              >
                <View
                  style={{
                    width: 154,
                    height: 154,
                    borderRadius: 77,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={["#a2d2ff", "#cdb4db"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={58} color="#fff" />
                  </LinearGradient>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {/* No-tasks toast */}
          {noTasksMsg && (
            <Animated.View
              style={noTasksAnimStyle}
              className="absolute -bottom-2 self-center bg-white rounded-full px-4 py-1.5 shadow-sm"
            >
              <Text className="text-[#6a7282] font-medium text-sm">{noTasksMsg}</Text>
            </Animated.View>
          )}
        </View>

        {/* AI ceiling banner */}
        {showCeilingBanner && (
          <View className="px-6 pb-2">
            <AiCeilingBanner
              onUpgrade={showPaywall}
              onBuyCredits={showPaywall}
              reason={ceilingStatus?.atCeiling ? ceilingStatus.reason : undefined}
              creditBalance={creditBalance ?? undefined}
            />
          </View>
        )}

        <HomeTourIntro />

        {/* Task card */}
        <View ref={tourRefs.taskCardRef} className="px-6">
          <TaskCard
            task={selectedTask}
            onComplete={handleComplete}
            onLater={() => setSelectedTask(null)}
          />
        </View>
      </ScrollView>

      <HomeTourOverlays tourLayouts={tourLayouts} />

      {/* Bottom nav */}
      <BottomNav
        addButtonRef={tourRefs.addNavButtonRef}
        onListPress={() => openSheet("allTasks")}
        onPreferencesPress={() => openSheet("preferences")}
        onAddPress={() => handleAddPress(() => flow.start())}
        onSettingsPress={() => openSheet("settings")}
        onProfilePress={() => openSheet("profile")}
      />
    </View>
  );
}
