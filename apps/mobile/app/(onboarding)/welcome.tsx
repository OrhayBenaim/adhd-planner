import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { useNeedsOnboarding } from "../../src/hooks/usePreferences";
import { AuthFlow } from "../../src/components/auth/AuthFlow";
import type { AuthFlowView } from "../../src/lib/authFlow";
import { useAndroidRootBack } from "../../src/components/home/useAndroidRootBack";
import { track } from "../../src/lib/analytics";

type SubView = "welcome" | "signIn";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("welcome");
  const [authView, setAuthView] = useState<AuthFlowView>("options");
  const authBackRef = useRef<(() => void) | null>(null);
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

  const welcomeToForm = useCallback(() => {
    setSubView("welcome");
    setAuthView("options");
  }, []);

  const authGoBack = useCallback(() => {
    authBackRef.current?.();
  }, []);

  const getBackState = useCallback(
    () => ({
      welcomeSubView: subView,
      welcomeAuthView: authView,
    }),
    [subView, authView],
  );

  const backHandlers = useMemo(
    () => ({
      welcomeToForm,
      authGoBack,
    }),
    [welcomeToForm, authGoBack],
  );

  const { exitToastVisible } = useAndroidRootBack(
    getBackState,
    backHandlers,
    subView === "signIn",
  );

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
              onViewChange={setAuthView}
              presentation={{
                usernameSignInTitle: "Welcome back",
                usernameSignInSubtitle: "Sign in to your account",
                usernameBack: "text",
              }}
              renderFooter={({ view, onBack }) => {
                authBackRef.current = onBack;
                return view === "options" ? (
                  <View className="items-center pb-6">
                    <Pressable
                      onPress={welcomeToForm}
                      className="flex-row items-center justify-center h-14"
                      style={{ gap: 6 }}
                    >
                      <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
                    </Pressable>
                  </View>
                ) : null;
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
        {exitToastVisible ? (
          <View className="absolute top-24 left-0 right-0 items-center z-[950] px-6">
            <View className="bg-white rounded-full px-5 py-3 shadow-sm border border-[#f3f4f6]">
              <Text className="text-sm font-medium text-[#0A0A0A]">
                Press back again to exit
              </Text>
            </View>
          </View>
        ) : null}
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
      {exitToastVisible ? (
        <View className="absolute top-24 left-0 right-0 items-center z-[950] px-6">
          <View className="bg-white rounded-full px-5 py-3 shadow-sm border border-[#f3f4f6]">
            <Text className="text-sm font-medium text-[#0A0A0A]">
              Press back again to exit
            </Text>
          </View>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}
