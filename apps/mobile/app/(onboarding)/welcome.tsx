import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { useNeedsOnboarding } from "../../src/hooks/usePreferences";
import { AuthOptions } from "../../src/components/auth/AuthOptions";
import { SignInWithEmail } from "../../src/components/auth/SignInWithEmail";
import { posthog } from "../../src/lib/posthog";

type SubView = "welcome" | "signIn" | "signInEmail";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("welcome");
  const needsOnboarding = useNeedsOnboarding();

  useEffect(() => {
    posthog.capture("Intro page loaded");
  }, []);

  useEffect(() => {
    if (needsOnboarding === false) {
      router.replace("/");
    }
  }, [needsOnboarding]);

  const handleSignInSuccess = useCallback(() => {
    // Navigation handled by needsOnboarding effect once Convex syncs
  }, []);

  if (subView === "signInEmail") {
    return (
      <OnboardingLayout
        step={1}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <SignInWithEmail
              onSuccess={handleSignInSuccess}
              title="Welcome back"
              subtitle="Sign in to your account"
            />
          </ScrollView>
          <View className="items-center pb-6" style={{ paddingTop: 16 }}>
            <Pressable
              onPress={() => setSubView("signIn")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </OnboardingLayout>
    );
  }

  if (subView === "signIn") {
    return (
      <OnboardingLayout
        step={1}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <View className="flex-1 justify-center">
          <AuthOptions
            mode="signIn"
            onSuccess={handleSignInSuccess}
            onEmailPress={() => setSubView("signInEmail")}
          />
        </View>
        <View className="items-center pb-6">
          <Pressable
            onPress={() => setSubView("welcome")}
            className="flex-row items-center justify-center h-14"
            style={{ gap: 6 }}
          >
            <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
          </Pressable>
        </View>
      </OnboardingLayout>
    );
  }

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

            <Text className="text-3xl font-bold text-[#1e2939] text-center mb-2">
              Welcome! 👋
            </Text>
            <Text className="text-lg text-[#4a5565] text-center mb-10">
              Let's personalize your experience.{"\n"}What should we call you?
            </Text>

            <TextInput
              value={state.name}
              onChangeText={(text) => updateField("name", text)}
              placeholder="Enter your name"
              placeholderTextColor="#99a1af"
              className="w-full border border-[#e5e7eb] rounded-3xl px-5 py-5 text-lg text-[#1e2939]"
            />

            <Pressable
              onPress={() => setSubView("signIn")}
              style={{ marginTop: 24 }}
            >
              <Text className="text-base text-[#6a7282]">
                Already have an account?{" "}
                <Text className="font-semibold text-[#a2d2ff]">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}
