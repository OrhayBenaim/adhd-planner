import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { EmailForm } from "./EmailForm";
import type { ComponentType } from "react";

interface SignUpWithEmailProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  name?: string;
  onSwitchToSignIn?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
}

export function SignUpWithEmail({
  onSuccess,
  onBeforeAuth,
  name,
  onSwitchToSignIn,
  InputComponent,
}: SignUpWithEmailProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      await onBeforeAuth?.();
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name ?? "",
      });
      if (error) {
        Sentry.captureMessage(
          `Sign-up failed: ${error.message ?? "unknown"}`,
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
  }, [email, password, name, onBeforeAuth, onSuccess]);

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Create your account
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Your data will be preserved
      </Text>
      <EmailForm
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitLabel="Sign Up"
        busy={busy}
        InputComponent={InputComponent}
      />
      {onSwitchToSignIn && (
        <View className="items-center mt-4">
          <Pressable onPress={onSwitchToSignIn}>
            <Text className="text-sm font-medium text-[#a2d2ff]">
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
