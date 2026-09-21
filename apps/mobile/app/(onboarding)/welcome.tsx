import { View, Text, TextInput, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useNeedsOnboarding } from "../../src/hooks/usePreferences";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { OnboardingAuth } from "../../src/components/onboarding/OnboardingAuth";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { useAndroidRootBack } from "../../src/hooks/useAndroidBack";
import { ExitArmingToast } from "../../src/components/ExitArmingToast";
import { onboardingColors as colors, onboardingStyles as styles } from "../../src/components/onboarding/theme";
import { track } from "../../src/lib/analytics";
import { useKeyboardHeight } from "../../src/hooks/useKeyboardHeight";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();
  const [signIn, setSignIn] = useState(false);
  const focused = useIsFocused();
  const needsOnboarding = useNeedsOnboarding();
  useEffect(() => {
    // Wait for Convex to see the signed-in account. Saving preferences on the
    // final step must not redirect this welcome screen while it is in the stack.
    if (focused && signIn && needsOnboarding === false) router.replace("/");
  }, [focused, signIn, needsOnboarding]);
  useEffect(() => { track("Intro page loaded"); }, []);
  const onDismiss = useCallback(() => {
    if (signIn) { setSignIn(false); return true; }
    return false;
  }, [signIn]);
  const { exitToastVisible } = useAndroidRootBack(onDismiss);
  const keyboardHeight = useKeyboardHeight();
  const next = () => {
    if (state.name.trim()) router.push("/(onboarding)/difficulties");
  };
  if (signIn) return <OnboardingLayout step={1} showProgress={false} showFooter={false}>
    <OnboardingAuth mode="signIn" name={state.name} onBack={() => setSignIn(false)}
      onSuccess={() => { /* The preferences subscription above handles navigation. */ }} />
  </OnboardingLayout>;

  return <OnboardingLayout step={1} onContinue={next} continueEnabled={!!state.name.trim()} reassurance="No account needed">
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={[styles.heading, { fontSize: 42, lineHeight: 45 }]}>lullio</Text>
      <Pressable accessibilityRole="button" onPress={() => setSignIn(true)} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={styles.label}>Sign in</Text>
      </Pressable>
    </View>
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[styles.heading, { fontSize: 39, lineHeight: 42, textAlign: "center" }]}>{"Big plans.\nTiny first steps."}</Text>
      <Text style={[styles.body, { fontSize: 18, lineHeight: 25, textAlign: "center" }]}>{"Meet lullio, your buddy for\ngetting started."}</Text>
    </View>
    {keyboardHeight === 0 && <Image source={require("../../assets/onboarding/helping.png")} resizeMode="contain" style={styles.artwork} />}
    <View style={{ gap: 8 }}>
      <Text style={[styles.body, { color: colors.ink }]}>What should I call you?</Text>
      <TextInput accessibilityLabel="What should I call you?" value={state.name}
        onChangeText={text => updateField("name", text)} placeholder="Your name"
        placeholderTextColor={colors.muted} maxLength={200} autoCapitalize="words"
        autoComplete="given-name" returnKeyType="next" onSubmitEditing={next}
        style={[styles.body, { minHeight: 54, paddingHorizontal: 16, paddingVertical: 14,
          borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.ink }]} />
    </View>
    <ExitArmingToast visible={exitToastVisible} />
  </OnboardingLayout>;
}
