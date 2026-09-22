import { useEffect } from "react";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { PreferenceStep } from "../../src/components/onboarding/PreferenceStep";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { PRODUCTIVE_TIMES } from "../../src/constants/onboarding";
import { track } from "../../src/lib/analytics";

export default function PreferenceScreen() {
  const { state, toggleArrayItem } = useOnboarding();
  useEffect(() => {
    track("onboarding_step_viewed", { step: "work_time", step_number: 4 });
  }, []);
  const next = () => router.push("/(onboarding)/save-progress");
  return (
    <OnboardingLayout step={4} onBack={() => router.back()} onContinue={next} onSkip={next}>
      <PreferenceStep title={"What time fits\nyou best?"} encouragement={"We’ll suggest tasks\nat your best times."}
        image={require("../../assets/onboarding/clock.png")}
        items={PRODUCTIVE_TIMES} selected={state.bestWorkTimes}
        onToggle={label => toggleArrayItem("bestWorkTimes", label)} columns={1} />
    </OnboardingLayout>
  );
}
