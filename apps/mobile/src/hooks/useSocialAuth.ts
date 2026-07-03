// apps/mobile/src/hooks/useSocialAuth.ts
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../lib/authClient";
import { getGoogleIdToken } from "../lib/googleSignIn";

interface UseSocialAuthOptions {
  /** Alert/Sentry prefix, e.g. "Sign-in failed" or "Link failed". */
  errorTitle: string;
  /** Runs before the auth call (e.g. persist onboarding data). */
  onBeforeAuth?: () => Promise<void>;
  onSuccess: () => void | Promise<void>;
}

/**
 * Google/Apple sign-in with the shared error handling (Alert + Sentry).
 * The single implementation behind every social auth entry point.
 */
export function useSocialAuth({ errorTitle, onBeforeAuth, onSuccess }: UseSocialAuthOptions) {
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(
    async (provider: "google" | "apple") => {
      setBusy(true);
      try {
        await onBeforeAuth?.();

        if (provider === "google") {
          const idToken = await getGoogleIdToken();
          if (!idToken) {
            Alert.alert(errorTitle, "Could not get Google credentials. Please try again.");
            return;
          }
          const { error } = await authClient.signIn.social({
            provider: "google",
            idToken: { token: idToken },
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(`${errorTitle}: ${error.message ?? "unknown"}`, "error");
            Alert.alert(errorTitle, error.message ?? "An unknown error occurred.");
            return;
          }
        } else {
          const { error } = await authClient.signIn.social({
            provider,
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(`${errorTitle}: ${error.message ?? "unknown"}`, "error");
            Alert.alert(errorTitle, error.message ?? "An unknown error occurred.");
            return;
          }
        }

        await onSuccess();
      } catch (e) {
        Sentry.captureException(e);
        Alert.alert(errorTitle, e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setBusy(false);
      }
    },
    [errorTitle, onBeforeAuth, onSuccess],
  );

  return { busy, signIn };
}
