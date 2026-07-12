// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback, useEffect, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { XPBar } from "../XPBar";
import { MoodSlider } from "../MoodSlider";
import { TaskCard } from "../TaskCard";
import { BottomNav } from "../BottomNav";
import { PointsToast } from "../PointsToast";
import { StreakBadge } from "../StreakBadge";
import { AiCeilingBanner } from "../AiCeilingBanner";
import { SurveyInviteOverlay } from "../surveys/SurveyInviteOverlay";
import { SurveyFormOverlay } from "../surveys/SurveyFormOverlay";
import { SurveyReminderBanner } from "../surveys/SurveyReminderBanner";
import { RatingPromptBanner } from "../RatingPromptBanner";
import { useHome } from "./HomeProvider";
import { useSheetNav } from "./SheetNavProvider";
import { useTaskCreationFlow } from "./TaskCreationFlowProvider";
import { useAndroidRootBack } from "../../hooks/useAndroidBack";
import { ExitArmingToast } from "../ExitArmingToast";
import { usePremium } from "../../hooks/usePremium";
import { useHomeExperience } from "../../hooks/useHomeExperience";
import { useRatingPrompt } from "../../hooks/useRatingPrompt";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { track } from "../../lib/analytics";
import { useHomeTour, HomeTourIntro, HomeTourOverlays } from "./HomeTour";

export function MainContent() {
  const {
    tasks,
    progress,
    streak,
    moodLevel,
    setMoodLevel,
    selectedTask,
    setSelectedTask,
    toast,
    hideToast,
    completeTask,
    showToast,
  } = useHome();
  const {
    creditBalance,
    banner,
    survey,
    surveyRewardToast,
    evaluateAiPick,
  } = useHomeExperience(tasks);
  const { openSheet, closeSheet, activeSheet } = useSheetNav();
  const flow = useTaskCreationFlow();
  const homeTour = useHomeTour();
  const guidedTour = useGuidedTour();
  const ratingPrompt = useRatingPrompt();
  const {
    refs: tourRefs,
    tourLayouts,
    tryHandleAIPick,
    notifyTaskCompleted,
    handleAddPress,
    handleTaskLater,
    ensureTourTaskSelected,
    isCompleteTaskStep,
  } = homeTour;

  const { isPremium, showPaywall } = usePremium();

  // Surveys use RN Modal (onRequestClose). Sheets/tour need explicit dismiss.
  const { exitToastVisible } = useAndroidRootBack(() => {
    if (guidedTour?.isActive) {
      guidedTour.skip();
      return true;
    }
    if (activeSheet !== "none") {
      closeSheet();
      return true;
    }
    return false;
  });

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

  const playAiPickAnimation = useCallback(() => {
    const ease = { duration: 300, easing: Easing.out(Easing.quad) };
    const settle = { duration: 400, easing: Easing.inOut(Easing.quad) };

    aiRotate.value = withSequence(
      withTiming(0.04, ease),
      withTiming(-0.04, ease),
      withTiming(0, settle),
    );
    aiScale.value = withSequence(withTiming(1.06, ease), withTiming(1, settle));
  }, [aiRotate, aiScale]);

  const showNoTasksToast = useCallback(
    (message: string) => {
      setNoTasksMsg(message);
      noTasksTranslateY.value = 0;
      noTasksOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 300 }),
      );
      noTasksTranslateY.value = withTiming(-30, { duration: 2500 });
    },
    [noTasksOpacity, noTasksTranslateY],
  );

  const handleAIPick = useCallback(() => {
    if (tryHandleAIPick(tasks, setSelectedTask)) return;

    playAiPickAnimation();

    const outcome = evaluateAiPick(moodLevel);
    if (outcome.type === "none-in-window") {
      const days = outcome.daysAhead;
      showNoTasksToast(
        `No tasks in the next ${days} day${days === 1 ? "" : "s"}`,
      );
      return;
    }
    if (outcome.type === "none-match-energy") {
      showNoTasksToast("No tasks match your energy right now");
      return;
    }

    setTimeout(() => setSelectedTask(outcome.task), 500);
  }, [
    tryHandleAIPick,
    tasks,
    setSelectedTask,
    playAiPickAnimation,
    evaluateAiPick,
    moodLevel,
    showNoTasksToast,
  ]);

  const handleComplete = useCallback(
    async (task: typeof selectedTask) => {
      if (!task) return;
      const result = await completeTask(task._id);
      track("task_completed");
      setSelectedTask(null);
      showToast(result?.earned ?? 0);
      notifyTaskCompleted();
    },
    [notifyTaskCompleted, completeTask, setSelectedTask, showToast],
  );

  useEffect(() => {
    ensureTourTaskSelected(tasks, selectedTask, setSelectedTask);
  }, [ensureTourTaskSelected, tasks, selectedTask, setSelectedTask]);

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
        {isPremium && streak && (
          <StreakBadge
            streak={streak.currentStreak}
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
        {banner.visible && (
          <View className="px-6 pb-2">
            <AiCeilingBanner
              onUpgrade={showPaywall}
              onBuyCredits={showPaywall}
              reason={banner.ceilingReason}
              creditBalance={creditBalance ?? undefined}
            />
          </View>
        )}

        <HomeTourIntro />

        {survey.reminderVisible && survey.campaign && (
          <View className="px-6">
            <SurveyReminderBanner
              campaign={survey.campaign}
              onTakeSurvey={survey.handleStart}
              onDismiss={survey.handleDismissReminder}
            />
          </View>
        )}

        {ratingPrompt.visible &&
          !survey.reminderVisible &&
          !guidedTour?.isActive && (
            <View className="px-6">
              <RatingPromptBanner
                onRate={ratingPrompt.handleRate}
                onDismiss={ratingPrompt.handleDismiss}
              />
            </View>
          )}

        {/* Task card */}
        <View ref={tourRefs.taskCardRef} className="px-6">
          <TaskCard
            task={selectedTask}
            onComplete={handleComplete}
            onLater={() => handleTaskLater(setSelectedTask)}
            hideLater={isCompleteTaskStep}
          />
        </View>
      </ScrollView>

      <HomeTourOverlays tourLayouts={tourLayouts} />

      {survey.overlayVisible && survey.campaign && (
        <SurveyInviteOverlay
          campaign={survey.campaign}
          onStart={survey.handleStart}
          onDefer={survey.handleDefer}
          onDismiss={survey.handleDismissOverlay}
        />
      )}

      {survey.formVisible && survey.formCampaign && (
        <SurveyFormOverlay
          campaign={survey.formCampaign}
          onClose={survey.closeSurveyForm}
          onSubmitted={survey.handleFormSubmitted}
        />
      )}

      {surveyRewardToast ? (
        <View className="absolute top-24 left-0 right-0 items-center z-[950] px-6">
          <View className="bg-white rounded-full px-5 py-3 shadow-sm border border-[#f3f4f6]">
            <Text className="text-sm font-medium text-[#0A0A0A]">
              {surveyRewardToast}
            </Text>
          </View>
        </View>
      ) : null}

      <ExitArmingToast visible={exitToastVisible} />

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
