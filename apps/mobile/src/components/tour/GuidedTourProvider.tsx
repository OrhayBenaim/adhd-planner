import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../lib/authClient";
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
  const [dismissed, setDismissed] = useState(false);
  const completeTourMutation = useMutation(api.preferences.completeTour);
  const { data: session } = authClient.useSession();
  const isAnonymous =
    (session?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous ?? true;

  const isActive = enabled && !dismissed;
  const currentStep = TOUR_STEPS[stepIndex];

  const completeTour = useCallback(() => {
    setDismissed(true);
    completeTourMutation().catch(() => {});
  }, [completeTourMutation]);

  const advance = useCallback(() => {
    // Leaving the celebration: the tour proper is done. Persist completion,
    // then offer account linking to anonymous users before dismissing.
    if (currentStep?.name === "celebration") {
      posthog.capture("guided_tour_completed");
      completeTourMutation().catch(() => {});
      if (!isAnonymous) {
        setDismissed(true);
        return;
      }
      posthog.capture("onboarding_save_progress_shown");
      setStepIndex((prev) => prev + 1);
      return;
    }

    const nextIndex = stepIndex + 1;
    if (currentStep?.name === "saveProgress" || nextIndex >= TOUR_STEPS.length) {
      setDismissed(true);
      return;
    }
    const nextStep = TOUR_STEPS[nextIndex];
    posthog.capture(nextStep.posthogEvent, {
      step: nextStep.step,
      stepName: nextStep.name,
    });
    setStepIndex((prev) => prev + 1);
  }, [stepIndex, currentStep, isAnonymous, completeTourMutation]);

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
