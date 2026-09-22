import { useEffect } from "react";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { PreferenceStep } from "../../src/components/onboarding/PreferenceStep";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { STRENGTHS } from "../../src/constants/onboarding";
import { track } from "../../src/lib/analytics";

export default function PreferenceScreen() {
  const { state, toggleArrayItem } = useOnboarding();
  useEffect(() => {
    track("onboarding_step_viewed", { step: "strengths", step_number: 3 });
  }, []);
  const next = () => router.push("/(onboarding)/work-time");
  return (
    <OnboardingLayout step={3} onBack={() => router.back()} onContinue={next} onSkip={next}>
      <PreferenceStep title={"What feels easy\nto get started?"} encouragement={"Let’s lean on what\ncomes naturally."}
        image={require("../../assets/onboarding/laundry.png")}
        items={STRENGTHS} selected={state.strengths}
        onToggle={label => toggleArrayItem("strengths", label)} />
    </OnboardingLayout>
  );
}
