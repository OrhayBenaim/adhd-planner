import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { EmailForm } from "./EmailForm";
import type { ComponentType } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignInWithEmailProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onSwitchToSignUp?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
  title?: string;
  subtitle?: string;
}

export function SignInWithEmail({
  onSuccess,
  onBeforeAuth,
  onSwitchToSignUp,
  InputComponent,
  title = "Sign in",
  subtitle = "Sign in to your existing account",
}: SignInWithEmailProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      await onBeforeAuth?.();
      const { error: authError } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        Sentry.captureMessage(
          `Email sign-in failed: ${authError.message ?? "unknown"}`,
          "error",
        );
        setError("Sign-in failed. Please check your credentials and try again.");
        return;
      }
      setPassword("");
      onSuccess();
    } catch (e) {
      Sentry.captureException(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [email, password, onBeforeAuth, onSuccess]);

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        {title}
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        {subtitle}
      </Text>
      <EmailForm
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitLabel="Sign In"
        busy={busy}
        error={error}
        InputComponent={InputComponent}
      />
      {onSwitchToSignUp && (
        <View className="items-center mt-4">
          <Pressable onPress={onSwitchToSignUp}>
            <Text className="text-sm font-medium text-[#a2d2ff]">
              Don't have an account? Sign up
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
