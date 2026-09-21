import { useCallback, useEffect, useState } from "react";
import { BackHandler, Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { OnboardingAuth } from "../../src/components/onboarding/OnboardingAuth";
import { OnboardingButton } from "../../src/components/onboarding/OnboardingButton";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { onboardingStyles as styles } from "../../src/components/onboarding/theme";
import { track } from "../../src/lib/analytics";

export default function SaveProgressStep() {
  const { state, saveOnboardingData, submitOnboarding, isSubmitting } = useOnboarding();
  const [authMode, setAuthMode] = useState<"link" | "signIn" | null>(null);
  useEffect(() => {
    track("onboarding_step_viewed", { step: "save_progress", step_number: 5 });
  }, []);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (authMode) { setAuthMode(null); return true; }
      return isSubmitting;
    });
    return () => subscription.remove();
  }, [authMode, isSubmitting]));

  if (authMode) return <OnboardingLayout step={5} showProgress={false} showFooter={false}>
    <OnboardingAuth mode={authMode} name={state.name} onBack={() => setAuthMode(null)}
      onBeforeAuth={saveOnboardingData} onSuccess={() => {
        track("onboarding_account_linked");
        router.replace("/");
      }} />
  </OnboardingLayout>;

  return <OnboardingLayout step={5} showFooter={false}>
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[styles.heading, { fontSize: 34, lineHeight: 43 }]}>{"A safe place for\nyour progress."}</Text>
      <Text style={[styles.body, { fontSize: 17, lineHeight: 21 }]}>Create an account to keep your tasks and progress in sync across devices.</Text>
    </View>
    <Image source={require("../../assets/onboarding/floating.png")} resizeMode="contain"
      style={[styles.artwork, { transform: [{ scaleX: -1 }] }]} />
    <View style={{ flex: 1, minHeight: 24 }} />
    <OnboardingButton label="Create account" disabled={isSubmitting} onPress={() => setAuthMode("link")} />
    <OnboardingButton label="I already have an account" secondary disabled={isSubmitting} onPress={() => setAuthMode("signIn")} />
    <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => {
      track("onboarding_save_progress_skipped");
      void submitOnboarding();
    }} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Text style={styles.link}>{isSubmitting ? "Saving..." : "Skip for now"}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={styles.link}>Back</Text>
    </Pressable>
  </OnboardingLayout>;
}
