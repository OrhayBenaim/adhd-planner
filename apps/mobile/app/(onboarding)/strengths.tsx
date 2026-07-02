import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useEffect } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { STRENGTHS } from "../../src/constants/onboarding";
import { posthog } from "../../src/lib/posthog";

export default function StrengthsStep() {
  const { state, toggleArrayItem } = useOnboarding();

  useEffect(() => {
    posthog.capture("onboarding_step_viewed", { step: "strengths", step_number: 4 });
  }, []);

  return (
    <OnboardingLayout
      step={4}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/notifications")}
      continueEnabled={state.strengths.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <MascotHeader
            pose="wave"
            title="And what do you enjoy?"
            subtitle="When your energy is low, I'll lean on the things that come naturally to you."
            mascotSize={110}
          />

          <Animated.View entering={FadeInDown.duration(400).delay(200)} className="w-full mt-8">
            <ChipGrid
              items={STRENGTHS}
              selected={state.strengths}
              onToggle={(label) => toggleArrayItem("strengths", label)}
              variant="strengths"
            />
          </Animated.View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
