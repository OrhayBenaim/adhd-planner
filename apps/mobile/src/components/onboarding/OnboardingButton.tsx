import { Pressable, Text } from "react-native";
import { onboardingColors as colors } from "./theme";

export function OnboardingButton({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => ({
        minHeight: 54, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 14,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primary,
        backgroundColor: secondary ? colors.white : colors.primary, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}>
      <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 17, lineHeight: 24,
        textAlign: "center", color: secondary ? colors.primary : colors.white }}>{label}</Text>
    </Pressable>
  );
}
