import { StyleSheet } from "react-native";
import { onboardingColors } from "../onboarding/theme";

export const homeColors = { ...onboardingColors, blue: "#d6f1fe", surface: "#fff5f8" };
export const homeStyles = StyleSheet.create({
  heading: { fontFamily: "Nunito-ExtraBold", fontSize: 29, lineHeight: 31, color: homeColors.ink },
  body: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 22, color: homeColors.body },
  caption: { fontFamily: "Inter-Regular", fontSize: 13, lineHeight: 18, color: homeColors.body },
  eyebrow: { fontFamily: "Inter-SemiBold", fontSize: 11, lineHeight: 15, letterSpacing: 1, color: homeColors.primary },
  card: { backgroundColor: homeColors.surface, borderColor: homeColors.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
});
