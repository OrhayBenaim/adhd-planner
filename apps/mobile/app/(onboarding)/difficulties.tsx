import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useEffect } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { DIFFICULTIES } from "../../src/constants/onboarding";
import { track } from "../../src/lib/analytics";

export default function DifficultiesStep() {
  const { state, toggleArrayItem } = useOnboarding();

  useEffect(() => {
    track("onboarding_step_viewed", { step: "difficulties", step_number: 3 });
  }, []);

  return (
    <OnboardingLayout
      step={3}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/strengths")}
      continueEnabled={state.difficulties.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <MascotHeader
            pose="wave"
            title="What feels hard to start?"
            subtitle="No judgment here — knowing this helps me pick the right task at the right moment."
            mascotSize={110}
          />

          <Animated.View entering={FadeInDown.duration(400).delay(200)} className="w-full mt-8">
            <ChipGrid
              items={DIFFICULTIES}
              selected={state.difficulties}
              onToggle={(label) => toggleArrayItem("difficulties", label)}
              variant="difficulties"
            />
          </Animated.View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
