import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import {
  usernameToInternalEmail,
  validateUsername,
} from "../../lib/authUsername";
import { UsernameForm } from "./UsernameForm";
import type { ComponentType } from "react";

const MIN_PASSWORD_LENGTH = 8;

interface SignUpWithUsernameProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  name?: string;
  onSwitchToSignIn?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
  title?: string;
  subtitle?: string;
}

export function SignUpWithUsername({
  onSuccess,
  onBeforeAuth,
  name,
  onSwitchToSignIn,
  InputComponent,
  title = "Create your account",
  subtitle = "Your data will be preserved",
}: SignUpWithUsernameProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const trimmedUsername = username.trim();

    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!password) {
      setError("Please enter a password.");
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
        email: usernameToInternalEmail(trimmedUsername),
        username: trimmedUsername,
        password,
        name: name || trimmedUsername,
      });
      if (authError) {
        Sentry.captureMessage(
          `Sign-up failed: ${authError.message ?? "unknown"}`,
          "error",
        );
        const userMessage =
          authError.code === "USERNAME_IS_ALREADY_TAKEN" ||
          authError.code === "USER_ALREADY_EXISTS"
            ? "This username is already taken. Try another or sign in instead."
            : "Sign-up failed. Please try again.";
        setError(userMessage);
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
  }, [username, password, name, onBeforeAuth, onSuccess]);

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        {title}
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        {subtitle}
      </Text>
      <UsernameForm
        username={username}
        onUsernameChange={setUsername}
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
