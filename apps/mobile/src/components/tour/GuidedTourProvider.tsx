import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
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
  // Once the tour starts, keep it active until explicitly dismissed — even if
  // `enabled` flips false after persisting completion mid-flow (save progress).
  const [engaged, setEngaged] = useState(false);
  const completeTourMutation = useMutation(api.preferences.completeTour);
  const { data: session } = authClient.useSession();
  const isAnonymous =
    (session?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous ?? true;

  useEffect(() => {
    if (enabled) setEngaged(true);
  }, [enabled]);

  const isActive = engaged && !dismissed;
  const currentStep = TOUR_STEPS[stepIndex];

  const completeTour = useCallback(() => {
    setDismissed(true);
    completeTourMutation().catch(() => {});
  }, [completeTourMutation]);

  const advance = useCallback(() => {
    // Leaving celebration: persist only for signed-in users; anonymous users
    // see save-progress first, then we persist when they finish or skip.
    if (currentStep?.name === "celebration") {
      posthog.capture("guided_tour_completed");
      if (!isAnonymous) {
        completeTour();
        return;
      }
      posthog.capture("onboarding_save_progress_shown");
      setStepIndex((prev) => prev + 1);
      return;
    }

    const nextIndex = stepIndex + 1;
    if (currentStep?.name === "saveProgress" || nextIndex >= TOUR_STEPS.length) {
      completeTour();
      return;
    }
    const nextStep = TOUR_STEPS[nextIndex];
    posthog.capture(nextStep.posthogEvent, {
      step: nextStep.step,
      stepName: nextStep.name,
    });
    setStepIndex((prev) => prev + 1);
  }, [stepIndex, currentStep, isAnonymous, completeTour]);

  const skip = useCallback(() => {
    posthog.capture("guided_tour_skipped");
    completeTour();
  }, [completeTour]);

  const isTourStep = useCallback(
    (name: TourStepName) => isActive && currentStep?.name === name,
    [isActive, currentStep],
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
