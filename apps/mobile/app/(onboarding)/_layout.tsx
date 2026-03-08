import { Stack } from "expo-router";
import { OnboardingProvider } from "../../src/components/onboarding/OnboardingProvider";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
          animationDuration: 250,
        }}
      />
    </OnboardingProvider>
  );
}
