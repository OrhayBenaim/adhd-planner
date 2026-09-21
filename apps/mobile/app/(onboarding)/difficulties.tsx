import { useEffect } from "react";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { PreferenceStep } from "../../src/components/onboarding/PreferenceStep";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { DIFFICULTIES } from "../../src/constants/onboarding";
import { track } from "../../src/lib/analytics";

export default function PreferenceScreen() {
  const { state, toggleArrayItem } = useOnboarding();
  useEffect(() => {
    track("onboarding_step_viewed", { step: "difficulties", step_number: 2 });
  }, []);
  const next = () => router.push("/(onboarding)/strengths");
  return (
    <OnboardingLayout step={2} onBack={() => router.back()} onContinue={next} onSkip={next}>
      <PreferenceStep title={"What feels hard\nto start?"} encouragement={"We can make the\nfirst step smaller."}
        image={require("../../assets/onboarding/reaching.png")}
        items={DIFFICULTIES} selected={state.difficulties}
        onToggle={label => toggleArrayItem("difficulties", label)} />
    </OnboardingLayout>
  );
}
