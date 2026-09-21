import { StyleSheet } from "react-native";

// Scoped to onboarding so other app flows retain their existing theme.
export const onboardingColors = {
  ink: "#510b31", primary: "#771344", body: "#4f3c64", muted: "#837591",
  accent: "#f17faf", border: "#f2cadc", selected: "#ffe4ef", white: "#ffffff",
};

export const onboardingStyles = StyleSheet.create({
  heading: { fontFamily: "Nunito-ExtraBold", fontSize: 32, lineHeight: 40, color: onboardingColors.ink },
  body: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 20, color: onboardingColors.body },
  label: { fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22, color: onboardingColors.ink },
  link: { fontFamily: "Inter-Regular", fontSize: 14, lineHeight: 18, color: onboardingColors.body },
  artwork: { width: "100%", maxWidth: 345, height: 230, alignSelf: "center" },
});
