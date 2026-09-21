// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { homeArtwork } from "../../../assets/home/artwork";
import { HomeHeader } from "./HomeHeader";
import { homeColors, homeStyles } from "./theme";

import { XPBar } from "../XPBar";
import { MoodSlider } from "../MoodSlider";
import { TaskCard } from "../TaskCard";
import { BottomNav } from "../BottomNav";
import { PointsToast } from "../PointsToast";

import { AiCeilingBanner } from "../AiCeilingBanner";
import { SurveyInviteOverlay } from "../surveys/SurveyInviteOverlay";
import { SurveyFormOverlay } from "../surveys/SurveyFormOverlay";
import { SurveyReminderBanner } from "../surveys/SurveyReminderBanner";
import { RatingPromptBanner } from "../RatingPromptBanner";
import { useHome } from "./HomeProvider";
import { useSheetNav } from "./SheetNavProvider";
import { useTaskCreationFlow } from "./TaskCreationFlowProvider";
import { usePremium } from "../../hooks/usePremium";
import { useHomeExperience } from "../../hooks/useHomeExperience";
import { useRatingPrompt } from "../../hooks/useRatingPrompt";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { track } from "../../lib/analytics";
import { useHomeTour, HomeTourOverlays } from "./HomeTour";

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
  const { openSheet, closeSheet } = useSheetNav();
  const scrollRef = useRef<ScrollView>(null);
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
    ensureTourTaskSelected,
  } = homeTour;

  const { isPremium, showPaywall } = usePremium();

  // "No tasks" toast
  const [noTasksMsg, setNoTasksMsg] = useState<string | null>(null);
  const noTasksOpacity = useSharedValue(0);
  const noTasksTranslateY = useSharedValue(0);
  const noTasksAnimStyle = useAnimatedStyle(() => ({
    opacity: noTasksOpacity.value,
    transform: [{ translateY: noTasksTranslateY.value }],
  }));

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

    const outcome = evaluateAiPick(moodLevel, selectedTask?._id);
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

    if (outcome.task._id === selectedTask?._id) {
      showNoTasksToast("This is the only task matching your energy right now.");
      return;
    }
    setSelectedTask(outcome.task);
  }, [
    tryHandleAIPick,
    tasks,
    setSelectedTask,
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

  const moodControl = (<View key="mood" ref={tourRefs.moodSliderRef} collapsable={false} style={{ marginHorizontal: 24 }}>
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </View>);
  const taskCard = (<View key="task" style={{ marginHorizontal: 24 }}>
          <TaskCard task={selectedTask} onComplete={handleComplete} onPick={handleAIPick}
            onAdd={() => handleAddPress(() => flow.start())} hasTasks={tasks.some(task => !task.completed)}
            pickButtonRef={tourRefs.aiButtonRef} completeButtonRef={tourRefs.taskCardRef} />
        </View>);

  return (
    <View ref={tourRefs.rootViewRef} collapsable={false} style={{ flex: 1, backgroundColor: "white" }}>
      <HomeHeader onSettings={() => openSheet("settings")} />
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!guidedTour?.isActive}
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, flexDirection: "row", gap: 12, alignItems: "center" }}>
          {isPremium && streak && <Pressable accessibilityRole="button" accessibilityLabel="View streak insights" onPress={() => openSheet("insights")}
            style={{ minHeight: 40, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 8, borderRadius: 14, backgroundColor: homeColors.surface }}>
            <SvgXml xml={homeArtwork.flame} width={22} height={22} />
            <Text style={[homeStyles.caption, { color: homeColors.primary }]}>{streak.currentStreak} day streak</Text>
          </Pressable>}
          <XPBar progress={progress} />
          <PointsToast points={toast.points} visible={toast.visible} onDone={hideToast} />
        </View>
        {guidedTour?.isActive ? [taskCard, moodControl] : [moodControl, taskCard]}
        {noTasksMsg && <Animated.View style={[noTasksAnimStyle, { marginHorizontal: 24 }]}>
          <Text accessibilityLiveRegion="polite" style={homeStyles.caption}>{noTasksMsg}</Text>
        </Animated.View>}

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


        {!guidedTour?.isActive && survey.reminderVisible && survey.campaign && (
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

      </ScrollView>


      {!guidedTour?.isActive && survey.overlayVisible && survey.campaign && (
        <SurveyInviteOverlay
          campaign={survey.campaign}
          onStart={survey.handleStart}
          onDefer={survey.handleDefer}
          onDismiss={survey.handleDismissOverlay}
        />
      )}

      {!guidedTour?.isActive && survey.formVisible && survey.formCampaign && (
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

      {/* Bottom nav */}
      <BottomNav
        addButtonRef={tourRefs.addNavButtonRef}
        onListPress={() => openSheet("allTasks")}
        onTodayPress={() => { closeSheet(); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
        onAddPress={() => handleAddPress(() => flow.start())}

      />
      <HomeTourOverlays tourLayouts={tourLayouts} />
    </View>
  );
}
