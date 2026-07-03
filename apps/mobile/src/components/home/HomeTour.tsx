import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import { View, type LayoutRectangle } from "react-native";

import { posthog } from "../../lib/posthog";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourIntroCard } from "../tour/TourIntroCard";
import { TourSpotlight } from "../tour/TourSpotlight";
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

  useEffect(() => {
    if (!tour) return;
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
    if (tour.isTourStep("createTask")) {
      measure(addNavButtonRef, "addButton");
    } else if (tour.isTourStep("moodMeter")) {
      measure(moodSliderRef, "mood");
    } else if (tour.isTourStep("aiPick")) {
      measure(aiButtonRef, "aiButton");
    } else if (tour.isTourStep("completeTask")) {
      measure(taskCardRef, "taskCard");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [tour?.currentStepIndex]);

  useEffect(() => {
    if (tour?.isTourStep("moodMeter")) {
      posthog.capture("guided_tour_task_created");
    }
  }, [tour?.currentStepIndex]);

  const tryHandleAIPick = useCallback(
    (tasks: Task[], setSelectedTask: (task: Task | null) => void): boolean => {
      if (!tour?.isTourStep("aiPick")) return false;
      const firstTask = tasks.find((t) => !t.completed);
      if (firstTask) {
        setSelectedTask(firstTask);
        tour.advance();
      }
      return true;
    },
    [tour],
  );

  const notifyTaskCompleted = useCallback(() => {
    if (!tour?.isTourStep("completeTask")) return;
    posthog.capture("guided_tour_task_completed");
    tour.advance();
  }, [tour]);

  const handleAddPress = useCallback(
    (startAddTask: () => void) => {
      if (tour?.isTourStep("createTask")) {
        posthog.capture("guided_tour_step_viewed", { step: 1, stepName: "createTask" });
        startAddTask();
        tour.advance();
        return;
      }
      startAddTask();
    },
    [tour],
  );

  const isCompleteTaskStep = tour?.isTourStep("completeTask") ?? false;

  const handleTaskLater = useCallback(
    (setSelectedTask: (task: Task | null) => void) => {
      if (isCompleteTaskStep) return;
      setSelectedTask(null);
    },
    [isCompleteTaskStep],
  );

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
    handleTaskLater,
    ensureTourTaskSelected,
    isCompleteTaskStep,
  };
}

export function HomeTourIntro() {
  const tour = useGuidedTour();
  if (!tour?.isTourStep("intro")) return null;

  return (
    <View className="px-0 py-4">
      <TourIntroCard
        onStart={() => {
          posthog.capture("guided_tour_started");
          tour.advance();
        }}
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
      {tour.isTourStep("createTask") && (
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
      {tour.isTourStep("moodMeter") && (
        <TourSpotlight
          targetLayout={tourLayouts.mood}
          title={TOUR_STEPS[4].title}
          description={TOUR_STEPS[4].description}
          stepNumber={TOUR_STEPS[4].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          buttonLabel={TOUR_STEPS[4].buttonLabel}
          onNext={tour.advance}
          tooltipPosition="below"
        />
      )}
      {tour.isTourStep("aiPick") && (
        <TourSpotlight
          targetLayout={tourLayouts.aiButton}
          title={TOUR_STEPS[5].title}
          description={TOUR_STEPS[5].description}
          stepNumber={TOUR_STEPS[5].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          tooltipPosition="below"
        />
      )}
      {tour.isTourStep("completeTask") && (
        <TourSpotlight
          targetLayout={tourLayouts.taskCard}
          title={TOUR_STEPS[6].title}
          description={TOUR_STEPS[6].description}
          stepNumber={TOUR_STEPS[6].step}
          totalSteps={VISIBLE_TOUR_STEP_COUNT}
          tooltipPosition="above"
        />
      )}
      {tour.isTourStep("celebration") && (
        <TourCelebration onFinish={tour.advance} />
      )}
      {tour.isTourStep("saveProgress") && (
        <SaveProgressOverlay onDone={tour.advance} />
      )}
    </>
  );
}
