/**
 * Guided tour — pure transition core.
 *
 * Step order, analytics, and persistence timing are encoded as
 * (state, event) -> { state, effects }. GuidedTourProvider interprets effects.
 */
import type { AnalyticsEventName, TourStepEvent } from "./analytics";
import {
  TOUR_STEPS,
  VISIBLE_TOUR_STEP_COUNT,
  tourStepAt,
  type TourStepName,
} from "./guidedTourSteps";

export interface GuidedTourState {
  stepIndex: number;
  dismissed: boolean;
  engaged: boolean;
}

export interface GuidedTourContext {
  isAnonymous: boolean;
}

export type GuidedTourEvent =
  | { type: "enabled" }
  | { type: "introAcknowledged" }
  | { type: "addPressed" }
  | { type: "daySelected" }
  | { type: "timeSelected" }
  | { type: "moodStepAcknowledged" }
  | { type: "aiPickHandled" }
  | { type: "taskCompleted" }
  | { type: "celebrationFinished" }
  | { type: "saveProgressDone" }
  | { type: "skipRequested" };

type TourStepProperties = { step: number; stepName: TourStepName };

export type GuidedTourEffect =
  | { type: "track"; event: AnalyticsEventName; properties?: Record<string, unknown> }
  | { type: "trackTourStepAdvance"; event: TourStepEvent; properties: TourStepProperties }
  | { type: "persistCompletion" };

export interface GuidedTourTransition {
  state: GuidedTourState;
  effects: GuidedTourEffect[];
}

export interface TourSheetUi {
  lockSheet: boolean;
  tooltip: {
    title: string;
    description: string;
    stepNumber: number;
    totalSteps: number;
  };
}

export function createInitialGuidedTourState(): GuidedTourState {
  return {
    stepIndex: 0,
    dismissed: false,
    engaged: false,
  };
}

export function isTourActive(state: GuidedTourState): boolean {
  return state.engaged && !state.dismissed;
}

export function currentTourStepName(state: GuidedTourState): TourStepName {
  return tourStepAt(state.stepIndex).name;
}

export function getDaySheetTourUi(state: GuidedTourState): TourSheetUi | null {
  if (!isTourActive(state) || currentTourStepName(state) !== "pickDay") {
    return null;
  }
  const step = TOUR_STEPS[2];
  return {
    lockSheet: true,
    tooltip: {
      title: step.title,
      description: step.description,
      stepNumber: step.step,
      totalSteps: VISIBLE_TOUR_STEP_COUNT,
    },
  };
}

export function getTimeSheetTourUi(state: GuidedTourState): TourSheetUi | null {
  if (!isTourActive(state) || currentTourStepName(state) !== "pickTime") {
    return null;
  }
  const step = TOUR_STEPS[3];
  return {
    lockSheet: true,
    tooltip: {
      title: step.title,
      description: step.description,
      stepNumber: step.step,
      totalSteps: VISIBLE_TOUR_STEP_COUNT,
    },
  };
}

function noop(state: GuidedTourState): GuidedTourTransition {
  return { state, effects: [] };
}

function stepAdvanceEffect(nextIndex: number): GuidedTourEffect {
  const next = tourStepAt(nextIndex);
  return {
    type: "trackTourStepAdvance",
    event: next.posthogEvent,
    properties: { step: next.step, stepName: next.name },
  };
}

function advanceTo(state: GuidedTourState, nextIndex: number, extraEffects: GuidedTourEffect[] = []): GuidedTourTransition {
  return {
    state: { ...state, stepIndex: nextIndex },
    effects: [...extraEffects, stepAdvanceEffect(nextIndex)],
  };
}

function completeTour(state: GuidedTourState, effects: GuidedTourEffect[]): GuidedTourTransition {
  return {
    state: { ...state, dismissed: true },
    effects: [...effects, { type: "persistCompletion" }],
  };
}

function skipTour(state: GuidedTourState): GuidedTourTransition {
  return completeTour(state, [{ type: "track", event: "guided_tour_skipped" }]);
}

export function transition(
  state: GuidedTourState,
  event: GuidedTourEvent,
  context: GuidedTourContext,
): GuidedTourTransition {
  if (event.type === "enabled") {
    if (state.engaged) {
      return noop(state);
    }
    return { state: { ...state, engaged: true }, effects: [] };
  }

  if (!isTourActive(state)) {
    return noop(state);
  }

  const stepName = currentTourStepName(state);

  switch (event.type) {
    case "introAcknowledged":
      if (stepName !== "intro") return noop(state);
      return advanceTo(state, 1, [{ type: "track", event: "guided_tour_started" }]);

    case "addPressed":
      if (stepName !== "createTask") return noop(state);
      return advanceTo(state, 2, [
        {
          type: "track",
          event: "guided_tour_step_viewed",
          properties: { step: 1, stepName: "createTask" },
        },
      ]);

    case "daySelected":
      if (stepName !== "pickDay") return noop(state);
      return advanceTo(state, 3);

    case "timeSelected":
      if (stepName !== "pickTime") return noop(state);
      return advanceTo(state, 4, [{ type: "track", event: "guided_tour_task_created" }]);

    case "moodStepAcknowledged":
      if (stepName !== "moodMeter") return noop(state);
      return advanceTo(state, 5);

    case "aiPickHandled":
      if (stepName !== "aiPick") return noop(state);
      return advanceTo(state, 6);

    case "taskCompleted":
      if (stepName !== "completeTask") return noop(state);
      return advanceTo(state, 7, [{ type: "track", event: "guided_tour_task_completed" }]);

    case "celebrationFinished":
      if (stepName !== "celebration") return noop(state);
      if (!context.isAnonymous) {
        return completeTour(state, [{ type: "track", event: "guided_tour_completed" }]);
      }
      return {
        state: { ...state, stepIndex: 8 },
        effects: [
          { type: "track", event: "guided_tour_completed" },
          { type: "track", event: "onboarding_save_progress_shown" },
        ],
      };

    case "saveProgressDone":
      if (stepName !== "saveProgress") return noop(state);
      return completeTour(state, []);

    case "skipRequested":
      return skipTour(state);

    default:
      return noop(state);
  }
}
