import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { authClient } from "../../src/lib/authClient";
import { SocialAuthButtons } from "../../src/components/auth/SocialAuthButtons";
import { SignUpWithEmail } from "../../src/components/auth/SignUpWithEmail";
import { SignInWithEmail } from "../../src/components/auth/SignInWithEmail";

type SubView = "main" | "options" | "signUpEmail" | "signInEmail";

export default function SignInStep() {
  const { state, submitOnboarding, saveOnboardingData, isSubmitting } =
    useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");
  const [socialBusy, setSocialBusy] = useState(false);

  const busy = isSubmitting || socialBusy;

  const handleSkip = async () => {
    await submitOnboarding();
  };

  const handleSocialSignIn = useCallback(
    async (provider: "google" | "apple") => {
      setSocialBusy(true);
      try {
        await saveOnboardingData();
        const { error } = await authClient.signIn.social({
          provider,
          callbackURL: "/",
        });
        if (error) {
          Sentry.captureMessage(
            `Social sign-in failed: ${error.message ?? "unknown"}`,
            "error",
          );
          return;
        }
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setSocialBusy(false);
      }
    },
    [saveOnboardingData],
  );

  // Email form sub-views
  if (subView === "signUpEmail" || subView === "signInEmail") {
    return (
      <OnboardingLayout
        step={6}
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
          >
            {subView === "signUpEmail" ? (
              <SignUpWithEmail
                onSuccess={() => {}}
                onBeforeAuth={saveOnboardingData}
                name={state.name.trim() || ""}
                onSwitchToSignIn={() => setSubView("signInEmail")}
              />
            ) : (
              <SignInWithEmail
                onSuccess={() => {}}
                onBeforeAuth={saveOnboardingData}
                onSwitchToSignUp={() => setSubView("signUpEmail")}
              />
            )}
          </ScrollView>

          {/* Back link */}
          <View className="items-center pb-6" style={{ paddingTop: 16 }}>
            <Pressable
              onPress={() => setSubView("options")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color="#6a7282" />
              <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </OnboardingLayout>
    );
  }

  // Sign-in method options sub-view
  if (subView === "options") {
    return (
      <OnboardingLayout
        step={6}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <View className="flex-1">
          <View style={{ marginBottom: 32 }}>
            <Text
              className="text-3xl font-bold text-[#1e2939] text-center"
              style={{ marginBottom: 12, lineHeight: 36 }}
            >
              Choose your{"\n"}sign-in method
            </Text>
            <Text className="text-lg text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <SocialAuthButtons
            onSocial={handleSocialSignIn}
            onEmail={() => setSubView("signUpEmail")}
            busy={busy}
          />

          {/* Don't have an account? */}
          <View className="items-center" style={{ marginTop: 24 }}>
            <Text className="text-base text-[#6a7282]">
              Don't have an account?
            </Text>
            <Pressable onPress={() => setSubView("signUpEmail")}>
              <Text className="text-base font-semibold text-[#a2d2ff] underline mt-1">
                Sign up here
              </Text>
            </Pressable>
          </View>

          {/* Back link */}
          <View className="flex-1 justify-end items-center pb-6">
            <Pressable
              onPress={() => setSubView("main")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color="#6a7282" />
              <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
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
      <View className="flex-1 items-center">
        {/* Illustration placeholder */}
        <View
          className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center"
          style={{ marginBottom: 32 }}
        >
          <Text className="text-6xl">☁️</Text>
        </View>

        {/* Cloud icon badge */}
        <LinearGradient
          colors={["#bde0fe", "#a2d2ff"]}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
          }}
        >
          <Ionicons name="cloud-outline" size={28} color="#fff" />
        </LinearGradient>

        <Text className="text-3xl font-bold text-[#1e2939] text-center mb-2">
          Save your progress ☁️
        </Text>
        <Text className="text-lg text-[#4a5565] text-center mb-10 px-4">
          Link an account to sync your data across devices and never lose your
          progress
        </Text>

        {/* Link Account button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 9999,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
          }}
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
        <Pressable onPress={handleSkip} disabled={busy}>
          <Text className="text-base font-medium text-[#6a7282]">
            {isSubmitting ? "Saving..." : "I'll do this later"}
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
