import { useState, useCallback } from "react";
import { View, Text, Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { getGoogleIdToken } from "../../lib/googleSignIn";
import { SocialAuthButtons } from "./SocialAuthButtons";

interface SignInOptionsProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onEmailPress: () => void;
}

export function SignInOptions({
  onSuccess,
  onBeforeAuth,
  onEmailPress,
}: SignInOptionsProps) {
  const [busy, setBusy] = useState(false);

  const handleSocial = useCallback(
    async (provider: "google" | "apple") => {
      setBusy(true);
      try {
        await onBeforeAuth?.();
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
              `Sign-in failed: ${error.message ?? "unknown"}`,
              "error",
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
              `Sign-in failed: ${error.message ?? "unknown"}`,
              "error",
            );
            Alert.alert("Sign-in failed", error.message ?? "An unknown error occurred.");
            return;
          }
        }
        onSuccess();
      } catch (e) {
        Sentry.captureException(e);
        Alert.alert("Sign-in failed", e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setBusy(false);
      }
    },
    [onBeforeAuth, onSuccess],
  );

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Sign in
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Sign in to your existing account
      </Text>
      <SocialAuthButtons
        onSocial={handleSocial}
        onEmail={onEmailPress}
        busy={busy}
      />
    </View>
  );
}
