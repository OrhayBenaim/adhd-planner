// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { useCallback, useEffect, useRef } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { homeArtwork } from "../../../assets/home/artwork";
import { HomeHeader } from "./HomeHeader";
import { homeColors, homeStyles } from "./theme";

import { XPBar } from "../XPBar";
import { MoodSlider } from "../MoodSlider";
import { NextStepSlot } from "./NextStepSlot";
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
import { useNextStep } from "../../hooks/useNextStep";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { track } from "../../lib/analytics";
import { useHomeTour, HomeTourOverlays } from "./HomeTour";

const reflow = LinearTransition.duration(200);

export function MainContent() {
  const {
    tasks,
    progress,
    streak,
    moodLevel,
    setMoodLevel,
    selectedTask,
    setSelectedTask,
    selectedTaskHydrated,
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
  const { openSheet } = useSheetNav();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const flow = useTaskCreationFlow();
  const homeTour = useHomeTour();
  const guidedTour = useGuidedTour();
  const ratingPrompt = useRatingPrompt();
  const {
    refs: tourRefs,
    tourLayouts,
    notifyTaskCompleted,
    handleAddPress,
    ensureTourTaskSelected,
  } = homeTour;

  const { isPremium, showPaywall } = usePremium();

  const nextStep = useNextStep({
    tasks, streak, moodLevel, selectedTask, setSelectedTask, selectedTaskHydrated,
    tourActive: guidedTour?.isActive ?? false, evaluateAiPick,
  });

  const handleComplete = useCallback(
    async (task: NonNullable<typeof selectedTask>) => {
      const result = await completeTask(task._id);
      track("task_completed");
      // Pick the next task in the same update, so the slot goes straight to it.
      setSelectedTask(nextStep.nextAfterCompleting(task._id));
      showToast(result?.earned ?? 0);
      notifyTaskCompleted();
    },
    [notifyTaskCompleted, completeTask, setSelectedTask, showToast, nextStep.nextAfterCompleting],
  );

  useEffect(() => {
    ensureTourTaskSelected(tasks, selectedTask, setSelectedTask);
  }, [ensureTourTaskSelected, tasks, selectedTask, setSelectedTask]);

  const moodControl = (<View key="mood" ref={tourRefs.moodSliderRef} collapsable={false} style={{ marginHorizontal: 24 }}>
          <MoodSlider value={moodLevel} onChange={setMoodLevel} onDraggingChange={nextStep.setMoodDragging} />
        </View>);
  const taskCard = nextStep.ready
    ? <NextStepSlot key="task" slot={nextStep.slot} onComplete={handleComplete}
        onAdd={() => handleAddPress(() => flow.start())} completeButtonRef={tourRefs.taskCardRef} />
    : null;

  return (
    <View ref={tourRefs.rootViewRef} collapsable={false} style={{ flex: 1, backgroundColor: "white" }}>
      <HomeHeader onSettings={() => router.push("/settings")} />
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!guidedTour?.isActive}
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, flexDirection: "row", gap: 12, alignItems: "center" }}>
          {streak && <Pressable accessibilityRole="button" accessibilityLabel="View streak insights" onPress={() => router.navigate("/insights")}
            style={{ minHeight: 40, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 8, borderRadius: 14, backgroundColor: homeColors.surface }}>
            <SvgXml xml={homeArtwork.flame} width={22} height={22} />
            <Text style={[homeStyles.caption, { color: homeColors.primary }]}>{streak.currentStreak} day streak</Text>
          </Pressable>}
          <XPBar progress={progress} />
          <PointsToast points={toast.points} visible={toast.visible} onDone={hideToast} />
        </View>
        {guidedTour?.isActive ? [taskCard, moodControl] : [moodControl, taskCard]}

        {/* AI ceiling banner */}
        {banner.visible && (
          <Animated.View layout={reflow} className="px-6 pb-2">
            <AiCeilingBanner
              onUpgrade={showPaywall}
              onBuyCredits={showPaywall}
              reason={banner.ceilingReason}
              creditBalance={creditBalance ?? undefined}
            />
          </Animated.View>
        )}


        {!guidedTour?.isActive && survey.reminderVisible && survey.campaign && (
          <Animated.View layout={reflow} className="px-6">
            <SurveyReminderBanner
              campaign={survey.campaign}
              onTakeSurvey={survey.handleStart}
              onDismiss={survey.handleDismissReminder}
            />
          </Animated.View>
        )}

        {ratingPrompt.visible &&
          !survey.reminderVisible &&
          !guidedTour?.isActive && (
            <Animated.View layout={reflow} className="px-6">
              <RatingPromptBanner
                onRate={ratingPrompt.handleRate}
                onDismiss={ratingPrompt.handleDismiss}
              />
            </Animated.View>
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
          <View style={{ backgroundColor: homeColors.white, borderColor: homeColors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, boxShadow: "0px 6px 18px rgba(119, 19, 68, 0.14)" }}>
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 15, lineHeight: 21, color: homeColors.ink }}>
              {surveyRewardToast}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Bottom nav */}
      <BottomNav
        active="today"
        addButtonRef={tourRefs.addNavButtonRef}
        onListPress={() => router.navigate("/plan")}
        onInsightsPress={() => router.navigate("/insights")}
        onTodayPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        onAddPress={() => handleAddPress(() => flow.start())}
      />
      <HomeTourOverlays tourLayouts={tourLayouts} />
    </View>
  );
}
