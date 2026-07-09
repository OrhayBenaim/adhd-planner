import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../lib/authClient";
import { track, trackTourStepAdvance } from "../../lib/analytics";
import {
  createInitialGuidedTourState,
  currentTourStepName,
  getDaySheetTourUi,
  getTimeSheetTourUi,
  isTourActive,
  transition,
  type GuidedTourContext,
  type GuidedTourEffect,
  type GuidedTourEvent,
  type TourSheetUi,
} from "../../lib/guidedTourFlow";
import type { TourStepName } from "../../lib/guidedTourSteps";

interface GuidedTourContextValue {
  isActive: boolean;
  currentStepName: TourStepName;
  currentStepIndex: number;
  daySheetTour: TourSheetUi | null;
  timeSheetTour: TourSheetUi | null;
  reportIntroAcknowledged: () => void;
  reportAddPressed: () => void;
  reportDaySelected: () => void;
  reportTimeSelected: () => void;
  reportMoodStepAcknowledged: () => void;
  reportAiPickHandled: () => void;
  reportTaskCompleted: () => void;
  reportCelebrationFinished: () => void;
  reportSaveProgressDone: () => void;
  skip: () => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function useGuidedTour() {
  return useContext(GuidedTourContext);
}

interface Props {
  children: ReactNode;
  enabled: boolean;
}

function executeEffect(
  effect: GuidedTourEffect,
  completeTourMutation: () => Promise<unknown>,
) {
  switch (effect.type) {
    case "track":
      if (effect.properties !== undefined) {
        track(effect.event, effect.properties as never);
      } else {
        track(effect.event);
      }
      break;
    case "trackTourStepAdvance":
      trackTourStepAdvance(effect.event, effect.properties);
      break;
    case "persistCompletion":
      completeTourMutation().catch(() => {});
      break;
  }
}

export function GuidedTourProvider({ children, enabled }: Props) {
  const completeTourMutation = useMutation(api.preferences.completeTour);
  const { data: session } = authClient.useSession();
  const isAnonymous =
    (session?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous ?? true;

  const [state, setState] = useState(createInitialGuidedTourState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const tourContext = useMemo<GuidedTourContext>(() => ({ isAnonymous }), [isAnonymous]);

  const runTransition = useCallback(
    (event: GuidedTourEvent) => {
      const result = transition(stateRef.current, event, tourContext);
      stateRef.current = result.state;
      setState(result.state);
      for (const effect of result.effects) {
        executeEffect(effect, completeTourMutation);
      }
    },
    [tourContext, completeTourMutation],
  );

  if (enabled && !state.engaged) {
    runTransition({ type: "enabled" });
  }

  const report = useCallback(
    (event: Exclude<GuidedTourEvent, { type: "enabled" | "skipRequested" }>) => {
      runTransition(event);
    },
    [runTransition],
  );

  const skip = useCallback(() => {
    runTransition({ type: "skipRequested" });
  }, [runTransition]);

  if (!isTourActive(state)) {
    return <>{children}</>;
  }

  return (
    <GuidedTourContext.Provider
      value={{
        isActive: true,
        currentStepName: currentTourStepName(state),
        currentStepIndex: state.stepIndex,
        daySheetTour: getDaySheetTourUi(state),
        timeSheetTour: getTimeSheetTourUi(state),
        reportIntroAcknowledged: () => report({ type: "introAcknowledged" }),
        reportAddPressed: () => report({ type: "addPressed" }),
        reportDaySelected: () => report({ type: "daySelected" }),
        reportTimeSelected: () => report({ type: "timeSelected" }),
        reportMoodStepAcknowledged: () => report({ type: "moodStepAcknowledged" }),
        reportAiPickHandled: () => report({ type: "aiPickHandled" }),
        reportTaskCompleted: () => report({ type: "taskCompleted" }),
        reportCelebrationFinished: () => report({ type: "celebrationFinished" }),
        reportSaveProgressDone: () => report({ type: "saveProgressDone" }),
        skip,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}
