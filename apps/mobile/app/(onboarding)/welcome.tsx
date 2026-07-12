import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { useNeedsOnboarding } from "../../src/hooks/usePreferences";
import { AuthFlow } from "../../src/components/auth/AuthFlow";
import { useAndroidRootBack } from "../../src/hooks/useAndroidBack";
import { ExitArmingToast } from "../../src/components/ExitArmingToast";
import { track } from "../../src/lib/analytics";

type SubView = "welcome" | "signIn";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("welcome");
  const needsOnboarding = useNeedsOnboarding();

  useEffect(() => {
    track("Intro page loaded");
  }, []);

  useEffect(() => {
    if (needsOnboarding === false) {
      router.replace("/");
    }
  }, [needsOnboarding]);

  const handleSignInSuccess = useCallback(() => {
    // Navigation handled by needsOnboarding effect once Convex syncs
  }, []);

  const { exitToastVisible } = useAndroidRootBack(() => {
    if (subView === "signIn") {
      setSubView("welcome");
      return true;
    }
    return false;
  });

  if (subView === "signIn") {
    return (
      <OnboardingLayout step={1} showFooter={false}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <AuthFlow
              mode="signIn"
              onSuccess={handleSignInSuccess}
              presentation={{
                usernameSignInTitle: "Welcome back",
                usernameSignInSubtitle: "Sign in to your account",
                usernameBack: "text",
              }}
              renderFooter={({ view }) =>
                view === "options" ? (
                  <View className="items-center pb-6">
                    <Pressable
                      onPress={() => setSubView("welcome")}
                      className="flex-row items-center justify-center h-14"
                      style={{ gap: 6 }}
                    >
                      <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
                    </Pressable>
                  </View>
                ) : null
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
            <MascotHeader
              pose="wave"
              title="Hi! I'm Lulli"
              subtitle={"I'll help you get things done, one small step at a time.\nWhat should I call you?"}
              mascotSize={190}
            />

            <Animated.View entering={FadeInDown.duration(400).delay(240)} className="w-full mt-8">
              <TextInput
                value={state.name}
                onChangeText={(text) => updateField("name", text)}
                placeholder="Enter your name"
                placeholderTextColor="#99a1af"
                className="w-full border border-[#e5e7eb] rounded-3xl px-5 py-5 text-lg text-[#1e2939]"
              />
            </Animated.View>

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
      <ExitArmingToast visible={exitToastVisible} />
    </OnboardingLayout>
  );
}
