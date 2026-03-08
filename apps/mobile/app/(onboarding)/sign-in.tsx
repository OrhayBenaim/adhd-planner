import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

type SubView = "main" | "options";

export default function SignInStep() {
  const { submitOnboarding, isSubmitting } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");

  const handleSkip = async () => {
    await submitOnboarding();
  };

  const handleSignIn = async (provider: "google" | "apple" | "email") => {
    // TODO: Implement actual auth provider sign-in
    // For now, just complete onboarding
    console.log(`[onboarding] sign-in with ${provider}`);
    await submitOnboarding();
  };

  if (subView === "options") {
    return (
      <OnboardingLayout
        step={6}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <View className="flex-1">
          <View className="mb-8">
            <Text className="text-2xl font-bold text-[#1e2939] text-center mb-3">
              Choose your sign-in method
            </Text>
            <Text className="text-base text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <View className="gap-3">
            {/* Google (Android only) */}
            {Platform.OS === "android" && (
              <Pressable
                onPress={() => handleSignIn("google")}
                disabled={isSubmitting}
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text className="text-base font-medium text-[#364153]">
                  Sign in with Google
                </Text>
              </Pressable>
            )}

            {/* Apple (iOS only) */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => handleSignIn("apple")}
                disabled={isSubmitting}
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
                <Text className="text-base font-medium text-[#364153]">
                  Sign in with Apple
                </Text>
              </Pressable>
            )}

            {/* Email (always) */}
            <Pressable
              onPress={() => handleSignIn("email")}
              disabled={isSubmitting}
              className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
            >
              <Ionicons name="mail-outline" size={24} color="#6a7282" />
              <Text className="text-base font-medium text-[#364153]">
                Sign in with Email
              </Text>
            </Pressable>
          </View>

          {/* Back link */}
          <View className="flex-1 justify-end items-center pb-6">
            <Pressable
              onPress={() => setSubView("main")}
              className="h-14 items-center justify-center"
            >
              <Text className="text-base font-medium text-[#6a7282]">
                ← Back
              </Text>
            </Pressable>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Main view — "Save your progress"
  return (
    <OnboardingLayout
      step={6}
      onContinue={() => {}}
      continueEnabled={false}
      showFooter={false}
    >
      <View className="flex-1 items-center justify-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center mb-4">
          <Text className="text-6xl">☁️</Text>
        </View>

        {/* Cloud icon badge */}
        <LinearGradient
          colors={["#bde0fe", "#a2d2ff"]}
          className="w-20 h-20 rounded-full items-center justify-center shadow-lg -mt-12 mb-6"
        >
          <Ionicons name="cloud" size={40} color="#fff" />
        </LinearGradient>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Save your progress ☁️
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10 px-4">
          Link an account to sync your data across devices and never lose your progress
        </Text>

        {/* Link Account button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="w-full h-14 rounded-3xl shadow-lg mb-4"
        >
          <Pressable
            onPress={() => setSubView("options")}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              Link Account
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Skip button */}
        <Pressable onPress={handleSkip} disabled={isSubmitting}>
          <Text className="text-base font-medium text-[#6a7282]">
            {isSubmitting ? "Saving..." : "I'll do this later"}
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
