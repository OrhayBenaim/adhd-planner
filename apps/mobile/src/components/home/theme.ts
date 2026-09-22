import { StyleSheet } from "react-native";
import { onboardingColors } from "../onboarding/theme";

export const homeColors = { ...onboardingColors, blue: "#d6f1fe", surface: "#fff5f8" };

// The dim behind sheets and survey overlays, which Figma weights differently.
export const scrim = { color: "#2a0b1a", sheet: 0.28, survey: 0.45 };
export const homeStyles = StyleSheet.create({
  heading: { fontFamily: "Nunito-ExtraBold", fontSize: 29, lineHeight: 31, color: homeColors.ink },
  body: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 22, color: homeColors.body },
  caption: { fontFamily: "Inter-Regular", fontSize: 13, lineHeight: 18, color: homeColors.body },
  eyebrow: { fontFamily: "Inter-SemiBold", fontSize: 11, lineHeight: 15, letterSpacing: 1, color: homeColors.primary },
  card: { backgroundColor: homeColors.surface, borderColor: homeColors.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },

  // Rating prompt and survey reminder: a notice sitting under the task card.
  notice: { backgroundColor: homeColors.white, borderColor: homeColors.border, borderWidth: 1, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, gap: 8, boxShadow: "0px 4px 16px rgba(119, 19, 68, 0.1)" },
  noticeTitle: { flex: 1, fontFamily: "Nunito-ExtraBold", fontSize: 24, lineHeight: 28, color: homeColors.ink },
  noticeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dismiss: { width: 28, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: homeColors.selected },

  // Survey invite, question and thank-you cards.
  scrim: { backgroundColor: scrim.color, opacity: scrim.survey },
  modalCard: { backgroundColor: homeColors.white, borderRadius: 28, paddingVertical: 26, paddingHorizontal: 22, gap: 14, alignItems: "center", boxShadow: "0px 12px 32px rgba(42, 11, 26, 0.22)" },
  modalTitle: { fontFamily: "Nunito-ExtraBold", fontSize: 26, lineHeight: 30, color: homeColors.ink, textAlign: "center" },
  modalBody: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 22, color: homeColors.body, textAlign: "center" },
  modalDismiss: { position: "absolute", top: 16, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: homeColors.selected },

  pill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: homeColors.blue },
  pillLabel: { fontFamily: "Inter-SemiBold", fontSize: 13, lineHeight: 18, color: homeColors.ink },
  eyebrowPill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: homeColors.selected },
  eyebrowPillLabel: { fontFamily: "Inter-SemiBold", fontSize: 12, lineHeight: 17, letterSpacing: 1, color: homeColors.ink },
  link: { fontFamily: "Inter-SemiBold", fontSize: 15, lineHeight: 21, color: homeColors.primary, textAlign: "center" },
  linkMuted: { fontFamily: "Inter-Regular", fontSize: 14, lineHeight: 20, color: homeColors.muted, textAlign: "center" },
});
