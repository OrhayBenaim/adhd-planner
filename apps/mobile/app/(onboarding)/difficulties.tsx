import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { DIFFICULTIES } from "../../src/constants/onboarding";

export default function DifficultiesStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={3}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/strengths")}
      continueEnabled={state.difficulties.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-40 h-40 rounded-3xl bg-[#ffafcc]/20 items-center justify-center mb-6">
            <Text className="text-5xl">😓</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            What feels hard? 😓
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Select tasks you find difficult or annoying (we'll help!)
          </Text>

          <ChipGrid
            items={DIFFICULTIES}
            selected={state.difficulties}
            onToggle={(id) => toggleArrayItem("difficulties", id)}
            variant="difficulties"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
