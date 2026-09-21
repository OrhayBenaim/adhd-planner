import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import { View, useWindowDimensions, type LayoutRectangle } from "react-native";

import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourIntroCard } from "../tour/TourIntroCard";
import { TOUR_SCRIM_COLOR, TourSpotlight } from "../tour/TourSpotlight";
import { TourCelebration } from "../tour/TourCelebration";
import { SaveProgressOverlay } from "../tour/SaveProgressOverlay";
import { TOUR_STEPS, VISIBLE_TOUR_STEP_COUNT } from "../tour/constants";
import type { Task } from "@adhd-planner/types";

type TourLayoutState = {
  mood: LayoutRectangle | null;
  aiButton: LayoutRectangle | null;
  taskCard: LayoutRectangle | null;
  addButton: LayoutRectangle | null;
};

type TourLayoutAction =
  | { type: "mood"; layout: LayoutRectangle }
  | { type: "aiButton"; layout: LayoutRectangle }
  | { type: "taskCard"; layout: LayoutRectangle }
  | { type: "addButton"; layout: LayoutRectangle };

export type HomeTourRefs = {
  rootViewRef: RefObject<View | null>;
  moodSliderRef: RefObject<View | null>;
  aiButtonRef: RefObject<View | null>;
  taskCardRef: RefObject<View | null>;
  addNavButtonRef: RefObject<View | null>;
};

export function useHomeTour() {
  const tour = useGuidedTour();
  const viewport = useWindowDimensions();

  const rootViewRef = useRef<View>(null);
  const moodSliderRef = useRef<View>(null);
  const aiButtonRef = useRef<View>(null);
  const taskCardRef = useRef<View>(null);
  const addNavButtonRef = useRef<View>(null);

  const refs: HomeTourRefs = {
    rootViewRef,
    moodSliderRef,
    aiButtonRef,
    taskCardRef,
    addNavButtonRef,
  };

  const [tourLayouts, dispatchTourLayout] = useReducer(
    (state: TourLayoutState, action: TourLayoutAction): TourLayoutState => ({
      ...state,
      [action.type]: action.layout,
    }),
    { mood: null, aiButton: null, taskCard: null, addButton: null },
  );

  const currentStepIndex = tour?.currentStepIndex;
  const currentStepName = tour?.currentStepName;

  useEffect(() => {
    if (currentStepIndex === undefined || currentStepName === undefined) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const measure = (ref: RefObject<View | null>, type: TourLayoutAction["type"]) => {
      timer = setTimeout(() => {
        const root = rootViewRef.current;
        if (!root) return;
        ref.current?.measureLayout(
          root,
          (x, y, width, height) => {
            dispatchTourLayout({ type, layout: { x, y, width, height } });
          },
          () => {},
        );
      }, 250);
    };
    if (currentStepName === "createTask") {
      measure(addNavButtonRef, "addButton");
    } else if (currentStepName === "moodMeter") {
      measure(moodSliderRef, "mood");
    } else if (currentStepName === "aiPick") {
      measure(aiButtonRef, "aiButton");
    } else if (currentStepName === "completeTask") {
      measure(taskCardRef, "taskCard");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentStepIndex, currentStepName, viewport.width, viewport.height]);

  const tryHandleAIPick = useCallback(
    (tasks: Task[], setSelectedTask: (task: Task | null) => void): boolean => {
      if (tour?.currentStepName !== "aiPick") return false;
      const firstTask = tasks.find((t) => !t.completed);
      if (firstTask) {
        setSelectedTask(firstTask);
        tour.reportAiPickHandled();
      }
      return true;
    },
    [tour],
  );

  const notifyTaskCompleted = useCallback(() => {
    if (tour?.currentStepName !== "completeTask") return;
    tour.reportTaskCompleted();
  }, [tour]);

  const handleAddPress = useCallback(
    (startAddTask: () => void) => {
      if (tour?.currentStepName === "createTask") {
        startAddTask();
        tour.reportAddPressed();
        return;
      }
      startAddTask();
    },
    [tour],
  );

  const isCompleteTaskStep = tour?.currentStepName === "completeTask";

  const ensureTourTaskSelected = useCallback(
    (tasks: Task[], selectedTask: Task | null, setSelectedTask: (task: Task | null) => void) => {
      if (!isCompleteTaskStep || selectedTask) return;
      const firstTask = tasks.find((t) => !t.completed);
      if (firstTask) setSelectedTask(firstTask);
    },
    [isCompleteTaskStep],
  );

  return {
    refs,
    tourLayouts,
    tryHandleAIPick,
    notifyTaskCompleted,
    handleAddPress,
    ensureTourTaskSelected,
    isCompleteTaskStep,
  };
}

export function HomeTourIntro() {
  const tour = useGuidedTour();
  if (tour?.currentStepName !== "intro") return null;

  return (
    <View accessibilityViewIsModal style={{ position: "absolute", inset: 0, zIndex: 900, justifyContent: "center", backgroundColor: TOUR_SCRIM_COLOR }}>
      <TourIntroCard
        onStart={tour.reportIntroAcknowledged}
        onSkip={tour.skip}
      />
    </View>
  );
}

interface HomeTourOverlaysProps {
  tourLayouts: TourLayoutState;
}

export function HomeTourOverlays({ tourLayouts }: HomeTourOverlaysProps) {
  const tour = useGuidedTour();
  if (!tour) return null;

  return (
    <>
      <HomeTourIntro />
      {tour.currentStepName === "createTask" && (
        <TourSpotlight
          targetLayout={tourLayouts.addButton}
          title={TOUR_STEPS[1].title}
          description={TOUR_STEPS[1].description}
          stepNumber={TOUR_STEPS[1].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          onSkip={tour.skip}
          tooltipPosition="above"
        />
      )}
      {tour.currentStepName === "moodMeter" && (
        <TourSpotlight
          targetLayout={tourLayouts.mood}
          title={TOUR_STEPS[4].title}
          description={TOUR_STEPS[4].description}
          stepNumber={TOUR_STEPS[4].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          buttonLabel={TOUR_STEPS[4].buttonLabel}
          onNext={tour.reportMoodStepAcknowledged}
          tooltipPosition="below"
        />
      )}
      {tour.currentStepName === "aiPick" && (
        <TourSpotlight
          targetLayout={tourLayouts.aiButton}
          title={TOUR_STEPS[5].title}
          description={TOUR_STEPS[5].description}
          stepNumber={TOUR_STEPS[5].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          tooltipPosition="below"
        />
      )}
      {tour.currentStepName === "completeTask" && (
        <TourSpotlight
          targetLayout={tourLayouts.taskCard}
          title={TOUR_STEPS[6].title}
          description={TOUR_STEPS[6].description}
          stepNumber={TOUR_STEPS[6].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          tooltipPosition="below"
        />
      )}
      {tour.currentStepName === "celebration" && (
        <TourCelebration onFinish={tour.reportCelebrationFinished} />
      )}
      {tour.currentStepName === "saveProgress" && (
        <SaveProgressOverlay onDone={tour.reportSaveProgressDone} />
      )}
    </>
  );
}
