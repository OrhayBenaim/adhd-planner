import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { validateUsername } from "../../lib/authUsername";
import { UsernameForm, type UsernameFormField } from "./UsernameForm";
import { onboardingColors as colors, onboardingStyles as styles } from "../onboarding/theme";
import type { ComponentType } from "react";

interface SignInWithUsernameProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onSwitchToSignUp?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
  title?: string;
  subtitle?: string;
}

export function SignInWithUsername({
  onSuccess,
  onBeforeAuth,
  onSwitchToSignUp,
  InputComponent,
  title = "Welcome back.",
  subtitle = "Enter the username and password you signed up with.",
}: SignInWithUsernameProps) {
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
      fail("Please enter your password.", "password");
      return;
    }

    setBusy(true);
    try {
      await onBeforeAuth?.();
      const { error: authError } = await authClient.signIn.username({
        username: trimmedUsername,
        password,
      });
      if (authError) {
        Sentry.captureMessage(
          `Username sign-in failed: ${authError.message ?? "unknown"}`,
          "error",
        );
        fail("Sign-in failed. Please check your credentials and try again.");
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
  }, [username, password, onBeforeAuth, onSuccess, fail]);

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
        submitLabel="Sign in"
        busy={busy}
        error={error}
        errorField={errorField}
        InputComponent={InputComponent}
      />
      {onSwitchToSignUp && (
        <Pressable onPress={onSwitchToSignUp} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={[styles.link, { fontFamily: "Inter-SemiBold", color: colors.primary, textAlign: "center" }]}>
            Don’t have an account? Sign up
          </Text>
        </Pressable>
      )}
    </View>
  );
}
