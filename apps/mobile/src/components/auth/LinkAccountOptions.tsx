import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { SocialAuthButtons } from "./SocialAuthButtons";

interface LinkAccountOptionsProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onEmailPress: () => void;
}

export function LinkAccountOptions({
  onSuccess,
  onBeforeAuth,
  onEmailPress,
}: LinkAccountOptionsProps) {
  const [busy, setBusy] = useState(false);

  const handleSocial = useCallback(
    async (provider: "google" | "apple") => {
      setBusy(true);
      try {
        await onBeforeAuth?.();
        const { error } = await authClient.signIn.social({
          provider,
          callbackURL: "/",
        });
        if (error) {
          Sentry.captureMessage(
            `Link account failed: ${error.message ?? "unknown"}`,
            "error",
          );
          return;
        }
        onSuccess();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    },
    [onBeforeAuth, onSuccess],
  );

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Link an account
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Your tasks and progress will be preserved
      </Text>
      <SocialAuthButtons
        onSocial={handleSocial}
        onEmail={onEmailPress}
        busy={busy}
      />
    </View>
  );
}
