import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();

  return (
    <OnboardingLayout
      step={1}
      onContinue={() => router.push("/(onboarding)/work-time")}
      continueEnabled={state.name.trim().length > 0}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            {/* Illustration placeholder */}
            <View className="w-48 h-48 rounded-3xl bg-[#ffc8dd]/20 items-center justify-center mb-8">
              <Text className="text-6xl">👋</Text>
            </View>

            <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
              Welcome! 👋
            </Text>
            <Text className="text-base text-[#4a5565] text-center mb-10">
              Let's personalize your experience.{"\n"}What should we call you?
            </Text>

            <TextInput
              value={state.name}
              onChangeText={(text) => updateField("name", text)}
              placeholder="Enter your name"
              placeholderTextColor="#99a1af"
              className="w-full border border-[#e5e7eb] rounded-3xl px-4 py-4 text-base text-[#1e2939]"
              autoFocus
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}
