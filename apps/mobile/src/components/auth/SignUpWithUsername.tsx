import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import {
  usernameToInternalEmail,
  validateUsername,
} from "../../lib/authUsername";
import { UsernameForm, type UsernameFormField } from "./UsernameForm";
import { onboardingColors as colors, onboardingStyles as styles } from "../onboarding/theme";
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
  title = "Pick a username.",
  subtitle = `${MIN_PASSWORD_LENGTH} characters or more for the password. No email needed.`,
}: SignUpWithUsernameProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<UsernameFormField | null>(null);

  const fail = useCallback((message: string, field: UsernameFormField | null = null) => {
    setError(message);
    setErrorField(field);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setErrorField(null);
    const trimmedUsername = username.trim();

    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      fail(usernameError, "username");
      return;
    }
    if (!password) {
      fail("Please enter a password.", "password");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, "password");
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
        const taken =
          authError.code === "USERNAME_IS_ALREADY_TAKEN" ||
          authError.code === "USER_ALREADY_EXISTS";
        fail(
          taken
            ? "That username is taken. Try another, or sign in instead."
            : "Sign-up failed. Please try again.",
          taken ? "username" : null,
        );
        return;
      }
      setPassword("");
      onSuccess();
    } catch (e) {
      Sentry.captureException(e);
      fail("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [username, password, name, onBeforeAuth, onSuccess, fail]);

  return (
    <View style={{ gap: 18 }}>
      <Text style={[styles.link, { fontSize: 13, color: colors.primary }]}>YOUR ACCOUNT</Text>
      <Text accessibilityRole="header" style={[styles.heading, { fontSize: 34, lineHeight: 43 }]}>
        {title}
      </Text>
      <Text style={[styles.body, { fontSize: 17, lineHeight: 21 }]}>{subtitle}</Text>
      <UsernameForm
        username={username}
        onUsernameChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitLabel="Create account"
        busy={busy}
        error={error}
        errorField={errorField}
        InputComponent={InputComponent}
      />
      {onSwitchToSignIn && (
        <Pressable onPress={onSwitchToSignIn} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={[styles.link, { fontFamily: "Inter-SemiBold", color: colors.primary, textAlign: "center" }]}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      )}
    </View>
  );
}
