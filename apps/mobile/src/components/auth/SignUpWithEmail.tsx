import { useState, useCallback, useEffect } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { EmailForm } from "./EmailForm";
import type { ComponentType } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface SignUpWithEmailProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  name?: string;
  onSwitchToSignIn?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
  title?: string;
  subtitle?: string;
}

export function SignUpWithEmail({
  onSuccess,
  onBeforeAuth,
  name,
  onSwitchToSignIn,
  InputComponent,
  title = "Create your account",
  subtitle = "Your data will be preserved",
}: SignUpWithEmailProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => setPassword("");
  }, []);

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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    try {
      await onBeforeAuth?.();
      const { error: authError } = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        name: name ?? "",
      });
      if (authError) {
        Sentry.captureMessage(
          `Sign-up failed: ${authError.message ?? "unknown"}`,
          "error",
        );
        setError("Sign-up failed. Please try again.");
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
  }, [email, password, name, onBeforeAuth, onSuccess]);

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
        submitLabel="Sign Up"
        busy={busy}
        error={error}
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
