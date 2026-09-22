import { View, Text, TextInput, type TextInputProps } from "react-native";
import type { ComponentType } from "react";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { onboardingColors as colors, onboardingStyles as styles } from "../onboarding/theme";

export type UsernameFormField = "username" | "password";

interface UsernameFormProps {
  username: string;
  onUsernameChange: (text: string) => void;
  password: string;
  onPasswordChange: (text: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  /** Field the error belongs to; highlights that input. */
  errorField?: UsernameFormField | null;
  InputComponent?: ComponentType<TextInputProps>;
}

const inputStyle = {
  minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 14,
  fontFamily: "Inter-Regular", fontSize: 16, color: colors.ink,
};

export function UsernameForm({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  onSubmit,
  submitLabel,
  busy,
  error,
  errorField,
  InputComponent = TextInput,
}: UsernameFormProps) {
  const Input = InputComponent;
  const borderFor = (field: UsernameFormField) =>
    errorField === field ? colors.danger : colors.border;

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 12 }}>
        <Input
          value={username}
          onChangeText={onUsernameChange}
          placeholder="Username"
          placeholderTextColor={colors.muted}
          style={[inputStyle, { borderColor: borderFor("username") }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          style={[inputStyle, { borderColor: borderFor("password") }]}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
        />
        {error ? <Text style={[styles.link, { color: colors.danger }]}>{error}</Text> : null}
      </View>
      <OnboardingButton
        label={busy ? "Please wait..." : submitLabel}
        onPress={onSubmit}
        disabled={busy}
      />
    </View>
  );
}
