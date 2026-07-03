// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text, type LayoutRectangle } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourIntroCard } from "../tour/TourIntroCard";
import { TourOverlay } from "../tour/TourOverlay";
import { TourCelebration } from "../tour/TourCelebration";
import { TOUR_STEPS } from "../tour/constants";

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
  const tour = useGuidedTour();

  // Tour target refs and layouts
  const moodSliderRef = useRef<View>(null);
  const aiButtonRef = useRef<View>(null);
  const taskCardRef = useRef<View>(null);

  type TourLayoutState = {
    mood: LayoutRectangle | null;
    aiButton: LayoutRectangle | null;
    taskCard: LayoutRectangle | null;
  };
  type TourLayoutAction =
    | { type: "mood"; layout: LayoutRectangle }
    | { type: "aiButton"; layout: LayoutRectangle }
    | { type: "taskCard"; layout: LayoutRectangle };

  const [tourLayouts, dispatchTourLayout] = useReducer(
    (state: TourLayoutState, action: TourLayoutAction): TourLayoutState => ({
      ...state,
      [action.type]: action.layout,
    }),
    { mood: null, aiButton: null, taskCard: null }
  );

  useEffect(() => {
    if (!tour) return;
    const measure = (ref: React.RefObject<View | null>, type: TourLayoutAction["type"]) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        dispatchTourLayout({ type, layout: { x, y, width, height } });
      });
    };
    if (tour.isTourStep("moodMeter")) {
      measure(moodSliderRef, "mood");
    } else if (tour.isTourStep("aiPick")) {
      measure(aiButtonRef, "aiButton");
    } else if (tour.isTourStep("completeTask")) {
      measure(taskCardRef, "taskCard");
    }
  }, [tour?.currentStepIndex]);

  useEffect(() => {
    if (tour?.isTourStep("moodMeter")) {
      posthog.capture("guided_tour_task_created");
    }
  }, [tour?.currentStepIndex]);
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
    if (tour?.isTourStep("aiPick")) {
      const firstTask = tasks.find((t) => !t.completed);
      if (firstTask) {
        setSelectedTask(firstTask);
        tour.advance();
      }
      return;
    }

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
  }, [tour, tasks, moodLevel, setSelectedTask, aiRotate, aiScale, aiPickDaysAhead, noTasksOpacity, noTasksTranslateY]);

  const handleComplete = useCallback(
    async (task: typeof selectedTask) => {
      if (!task) return;
      const result = await completeTask(task._id);
      posthog.capture("task_completed");
      setSelectedTask(null);
      showToast(result?.earned ?? 0);
      if (tour?.isTourStep("completeTask")) {
        posthog.capture("guided_tour_task_completed");
        tour.advance();
      }
    },
    [tour, completeTask, setSelectedTask, showToast],
  );

  const aiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aiScale.value }, { rotate: `${aiRotate.value}rad` }],
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
        <View ref={moodSliderRef} className="px-6 pt-2 pb-8">
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </View>

        {/* AI button */}
        <View ref={aiButtonRef} className="items-center pb-6">
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

        {/* Tour: Intro card (step 0) */}
        {tour?.isTourStep("intro") && (
          <View className="px-0 py-4">
            <TourIntroCard
              onStart={() => {
                posthog.capture("guided_tour_started");
                tour.advance();
              }}
              onSkip={tour.skip}
            />
          </View>
        )}

        {/* Tour: Create first task CTA (step 1) */}
        {tour?.isTourStep("createTask") && (
          <View className="px-6 py-4">
            <Pressable
              onPress={() => {
                posthog.capture("guided_tour_step_viewed", { step: 1, stepName: "createTask" });
                flow.start();
                tour.advance();
              }}
            >
              <LinearGradient
                colors={["#a2d2ff", "#cdb4db"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
              >
                <Text className="text-white font-semibold text-lg">Add your first task</Text>
                <Text className="text-white/80 text-sm mt-1">What do you need to get done? Tap to get started.</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Task card */}
        <View ref={taskCardRef} className="px-6">
          <TaskCard
            task={selectedTask}
            onComplete={handleComplete}
            onLater={() => setSelectedTask(null)}
          />
        </View>
      </ScrollView>

      {/* Tour overlays */}
      {tour?.isTourStep("moodMeter") && (
        <TourOverlay
          targetLayout={tourLayouts.mood}
          title={TOUR_STEPS[4].title}
          description={TOUR_STEPS[4].description}
          buttonLabel={TOUR_STEPS[4].buttonLabel}
          onPress={tour.advance}
          tooltipPosition="below"
        />
      )}
      {tour?.isTourStep("aiPick") && (
        <TourOverlay
          targetLayout={tourLayouts.aiButton}
          title={TOUR_STEPS[5].title}
          description={TOUR_STEPS[5].description}
          tooltipPosition="below"
        />
      )}
      {tour?.isTourStep("completeTask") && (
        <TourOverlay
          targetLayout={tourLayouts.taskCard}
          title={TOUR_STEPS[6].title}
          description={TOUR_STEPS[6].description}
          tooltipPosition="above"
        />
      )}
      {tour?.isTourStep("celebration") && (
        <TourCelebration onFinish={tour.advance} />
      )}

      {/* Bottom nav */}
      <BottomNav
        onListPress={() => openSheet("allTasks")}
        onPreferencesPress={() => openSheet("preferences")}
        onAddPress={() => flow.start()}
        onSettingsPress={() => openSheet("settings")}
        onProfilePress={() => openSheet("profile")}
      />
    </View>
  );
}
