import { StyleSheet } from "react-native";

// Shared by onboarding, home and auth; flows still on the old theme keep their own colors.
export const onboardingColors = {
  ink: "#510b31", primary: "#771344", body: "#4f3c64", muted: "#837591",
  accent: "#f17faf", border: "#f2cadc", selected: "#ffe4ef", white: "#ffffff",
  danger: "#c02a4d",
  // Chart and decorative accents, from the Lullio / Redesign draft collection.
  lavender: "#a89cd5", mint: "#77aba0",
};

export const onboardingStyles = StyleSheet.create({
  heading: { fontFamily: "Nunito-ExtraBold", fontSize: 32, lineHeight: 40, color: onboardingColors.ink },
  body: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 20, color: onboardingColors.body },
  label: { fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22, color: onboardingColors.ink },
  link: { fontFamily: "Inter-Regular", fontSize: 14, lineHeight: 18, color: onboardingColors.body },
  artwork: { width: "100%", maxWidth: 345, height: 230, alignSelf: "center" },
});
