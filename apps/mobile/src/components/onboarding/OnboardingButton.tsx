import { ActivityIndicator, Pressable, Text } from "react-native";
import { onboardingColors as colors } from "./theme";

export function OnboardingButton({ label, onPress, disabled = false, secondary = false, compact = false, loading = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
  /** 48px tall instead of 54px (Home empty states). */
  compact?: boolean;
  /** Shows a spinner in place of the label and ignores presses; the label stays the accessibility label. */
  loading?: boolean;
}) {
  const color = secondary ? colors.primary : colors.white;
  return (
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading}
      onPress={onPress} style={({ pressed }) => ({
        minHeight: compact ? 48 : 54, borderRadius: 999, paddingHorizontal: 16, paddingVertical: compact ? 11 : 14,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primary,
        backgroundColor: secondary ? colors.white : colors.primary, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}>
      {loading
        ? <ActivityIndicator color={color} />
        : <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 17, lineHeight: 24,
          textAlign: "center", color }}>{label}</Text>}
    </Pressable>
  );
}
