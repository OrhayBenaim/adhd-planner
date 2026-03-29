import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { posthog } from "../../lib/posthog";
import { TOUR_STEPS, type TourStepName } from "./constants";

interface GuidedTourContextValue {
  isActive: boolean;
  currentStepName: TourStepName;
  currentStepIndex: number;
  advance: () => void;
  skip: () => void;
  isTourStep: (name: TourStepName) => boolean;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function useGuidedTour() {
  return useContext(GuidedTourContext);
}

interface Props {
  children: ReactNode;
  enabled: boolean;
}

export function GuidedTourProvider({ children, enabled }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(enabled);
  const completeTourMutation = useMutation(api.preferences.completeTour);

  const currentStep = TOUR_STEPS[stepIndex];

  const completeTour = useCallback(() => {
    setIsActive(false);
    completeTourMutation().catch(() => {});
  }, [completeTourMutation]);

  const advance = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      posthog.capture("guided_tour_completed");
      completeTour();
      return;
    }
    const nextStep = TOUR_STEPS[nextIndex];
    posthog.capture(nextStep.posthogEvent, {
      step: nextStep.step,
      stepName: nextStep.name,
    });
    setStepIndex(nextIndex);
  }, [stepIndex, completeTour]);

  const skip = useCallback(() => {
    posthog.capture("guided_tour_skipped");
    completeTour();
  }, [completeTour]);

  const isTourStep = useCallback(
    (name: TourStepName) => isActive && currentStep?.name === name,
    [isActive, currentStep]
  );

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <GuidedTourContext.Provider
      value={{
        isActive,
        currentStepName: currentStep.name,
        currentStepIndex: stepIndex,
        advance,
        skip,
        isTourStep,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}
