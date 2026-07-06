import { useState, useCallback } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Mascot } from "../mascot/Mascot";
import { authClient } from "../../lib/authClient";
import { getGoogleIdToken } from "../../lib/googleSignIn";
import { SocialAuthButtons } from "../auth/SocialAuthButtons";
import { SignUpWithUsername } from "../auth/SignUpWithUsername";
import { SignInWithUsername } from "../auth/SignInWithUsername";
import { usePreferences } from "../../hooks/usePreferences";
import { posthog } from "../../lib/posthog";

type SubView = "main" | "options" | "signUpUsername" | "signInUsername";

interface Props {
  /** Called when the user links an account or chooses to do it later. */
  onDone: () => void;
}

/** End-of-onboarding prompt to link the anonymous account. */
export function SaveProgressOverlay({ onDone }: Props) {
  const [subView, setSubView] = useState<SubView>("main");
  const [socialBusy, setSocialBusy] = useState(false);
  const preferences = usePreferences();

  const handleLinked = useCallback(() => {
    posthog.capture("onboarding_account_linked");
    onDone();
  }, [onDone]);

  const handleSkip = useCallback(() => {
    posthog.capture("onboarding_save_progress_skipped");
    onDone();
  }, [onDone]);

  const handleSocialSignIn = useCallback(
    async (provider: "google" | "apple") => {
      setSocialBusy(true);
      try {
        if (provider === "google") {
          const idToken = await getGoogleIdToken();
          if (!idToken) {
            Alert.alert("Sign-in failed", "Could not get Google credentials. Please try again.");
            return;
          }
          const { error } = await authClient.signIn.social({
            provider: "google",
            idToken: { token: idToken },
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(
              `Social sign-in failed: ${error.message ?? "unknown"}`,
              "error"
            );
            Alert.alert("Sign-in failed", error.message ?? "An unknown error occurred.");
            return;
          }
        } else {
          const { error } = await authClient.signIn.social({
            provider,
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(
              `Social sign-in failed: ${error.message ?? "unknown"}`,
              "error"
            );
            Alert.alert("Sign-in failed", error.message ?? "An unknown error occurred.");
            return;
          }
        }
        handleLinked();
      } catch (e) {
        Sentry.captureException(e);
        Alert.alert("Sign-in failed", e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setSocialBusy(false);
      }
    },
    [handleLinked]
  );

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 z-[900] justify-center"
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="justify-center"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mx-6">
        
            <View
              className="bg-white rounded-3xl px-6 py-6"
              style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)" }}
            >
              {subView === "main" && (
                <>
                 <View className="items-center z-10">
                <Mascot pose="wave" size={130} />
              </View>
                  <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2 mt-2">
                    One more thing — save your progress
                  </Text>
                  <Text className="text-base text-[#6A7282] text-center mb-5 leading-6">
                    Link an account so your tasks and XP are safe across devices. Your data stays exactly as it is.
                  </Text>
                  <Pressable onPress={() => setSubView("options")}>
                    <LinearGradient
                      colors={["#a2d2ff", "#cdb4db"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
                    >
                      <Text className="text-white font-semibold text-base">Link account</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={handleSkip} className="mt-3 items-center py-2">
                    <Text className="text-sm text-[#99a1af]">Maybe later</Text>
                  </Pressable>
                </>
              )}

              {subView === "options" && (
                <>
                  <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-5">
                    How would you like to sign up?
                  </Text>
                  <SocialAuthButtons
                    onSocial={handleSocialSignIn}
                    onUsername={() => setSubView("signUpUsername")}
                    busy={socialBusy}
                    labelPrefix="Continue with"
                  />
                  <Pressable
                    onPress={() => setSubView("main")}
                    className="mt-4 flex-row items-center justify-center py-2"
                    style={{ gap: 6 }}
                  >
                    <Ionicons name="arrow-back" size={18} color="#6a7282" />
                    <Text className="text-base font-medium text-[#6a7282]">Back</Text>
                  </Pressable>
                </>
              )}

              {subView === "signUpUsername" && (
                <>
                  <SignUpWithUsername
                    onSuccess={handleLinked}
                    name={preferences?.name?.trim() || ""}
                    onSwitchToSignIn={() => setSubView("signInUsername")}
                    title="Create your account"
                    subtitle="Your data will be preserved"
                  />
                  <Pressable
                    onPress={() => setSubView("options")}
                    className="mt-4 flex-row items-center justify-center py-2"
                    style={{ gap: 6 }}
                  >
                    <Ionicons name="arrow-back" size={18} color="#6a7282" />
                    <Text className="text-base font-medium text-[#6a7282]">Back</Text>
                  </Pressable>
                </>
              )}

              {subView === "signInUsername" && (
                <>
                  <SignInWithUsername
                    onSuccess={handleLinked}
                    onSwitchToSignUp={() => setSubView("signUpUsername")}
                    title="Welcome back"
                    subtitle="Sign in to your account"
                  />
                  <Pressable
                    onPress={() => setSubView("options")}
                    className="mt-4 flex-row items-center justify-center py-2"
                    style={{ gap: 6 }}
                  >
                    <Ionicons name="arrow-back" size={18} color="#6a7282" />
                    <Text className="text-base font-medium text-[#6a7282]">Back</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
