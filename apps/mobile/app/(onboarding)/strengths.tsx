import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { STRENGTHS } from "../../src/constants/onboarding";

export default function StrengthsStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={4}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/notifications")}
      continueEnabled={state.strengths.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-40 h-40 rounded-3xl bg-[#a2d2ff]/20 items-center justify-center mb-6">
            <Text className="text-5xl">😊</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            What do you enjoy? 😊
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Select tasks that come naturally to you
          </Text>

          <ChipGrid
            items={STRENGTHS}
            selected={state.strengths}
            onToggle={(label) => toggleArrayItem("strengths", label)}
            variant="strengths"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
