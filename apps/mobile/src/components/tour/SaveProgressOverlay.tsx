import { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { AuthFlow } from "../auth/AuthFlow";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeColors as colors, homeStyles } from "../home/theme";
import { TOUR_SCRIM_COLOR } from "./TourSpotlight";
import { usePreferences } from "../../hooks/usePreferences";
import { track } from "../../lib/analytics";

type SubView = "main" | "options";

interface Props {
  /** Called when the user links an account or chooses to do it later. */
  onDone: () => void;
}

/** End-of-onboarding prompt to link the anonymous account. */
export function SaveProgressOverlay({ onDone }: Props) {
  const [subView, setSubView] = useState<SubView>("main");
  const preferences = usePreferences();

  const handleLinked = useCallback(() => {
    track("onboarding_account_linked");
    onDone();
  }, [onDone]);

  const handleSkip = useCallback(() => {
    track("onboarding_save_progress_skipped");
    onDone();
  }, [onDone]);

  return (
    <Animated.View
      accessibilityViewIsModal
      entering={FadeIn.duration(300)}
      style={{ position: "absolute", inset: 0, zIndex: 900, justifyContent: "center", backgroundColor: TOUR_SCRIM_COLOR }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="justify-center"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ marginHorizontal: 24, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 26, backgroundColor: colors.white, gap: 14 }}
          >
            {subView === "main" && (
              <>
                <Image
                  source={require("../../../assets/onboarding/floating.png")}
                  resizeMode="contain"
                  style={{ width: 150, height: 150, alignSelf: "center" }}
                />
                <Text style={[homeStyles.heading, { fontSize: 32, lineHeight: 41, textAlign: "center" }]}>
                  One more thing
                </Text>
                <Text style={[homeStyles.body, { fontSize: 15, lineHeight: 19, textAlign: "center" }]}>
                  Link an account so your tasks and XP are safe across devices. Your data stays exactly as it is.
                </Text>
                <OnboardingButton label="Create an account" onPress={() => setSubView("options")} />
                <Pressable onPress={handleSkip} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={homeStyles.linkMuted}>Maybe later</Text>
                </Pressable>
              </>
            )}

            {subView === "options" && (
              <AuthFlow
                mode="link"
                onSuccess={handleLinked}
                presentation={{
                  hideOptionsHeader: true,
                  signUpName: preferences?.name?.trim() || "",
                  usernameBack: "back",
                }}
                renderHeader={({ view }) =>
                  view === "options" ? (
                    <View style={{ gap: 14 }}>
                      <Text style={[homeStyles.eyebrow, { textAlign: "center" }]}>YOUR ACCOUNT</Text>
                      <Text style={[homeStyles.heading, { fontSize: 32, lineHeight: 41, textAlign: "center" }]}>
                        Keep your progress with you.
                      </Text>
                      <Text style={[homeStyles.body, { fontSize: 15, lineHeight: 19, textAlign: "center" }]}>
                        Choose how you’d like to create your account. Your preferences stay with you.
                      </Text>
                    </View>
                  ) : null
                }
                renderOptions={({ onSocial, onUsername, busy }) => (
                  <View style={{ gap: 14, paddingTop: 14 }}>
                    {Platform.OS === "android" && (
                      <OnboardingButton label={busy ? "Please wait..." : "Continue with Google"} disabled={busy} onPress={() => onSocial("google")} />
                    )}
                    {Platform.OS === "ios" && (
                      <OnboardingButton label={busy ? "Please wait..." : "Continue with Apple"} disabled={busy} onPress={() => onSocial("apple")} />
                    )}
                    <OnboardingButton secondary label="Continue with username" disabled={busy} onPress={onUsername} />
                    <Pressable
                      onPress={() => setSubView("main")}
                      accessibilityRole="button"
                      disabled={busy}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Text style={homeStyles.linkMuted}>Back</Text>
                    </Pressable>
                  </View>
                )}
              />
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
