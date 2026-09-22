import { StyleSheet } from "react-native";
import { homeColors } from "../home/theme";

// Settings runs on the home palette, plus the two greys the locked badges use.
export const settingsColors = { ...homeColors, lockedDisc: "#eef1f5", lockedInk: "#a99fb3" };

export const settingsStyles = StyleSheet.create({
  // Header: the parent section on a detail screen, the screen name on the root.
  parent: { fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22, color: homeColors.body },
  screenName: { fontFamily: "Nunito-ExtraBold", fontSize: 36, lineHeight: 44, color: homeColors.ink },
  back: { width: 44, height: 44, borderRadius: 20, borderWidth: 2, borderColor: homeColors.white,
    backgroundColor: homeColors.selected, alignItems: "center", justifyContent: "center" },

  title: { fontFamily: "Nunito-ExtraBold", fontSize: 30, lineHeight: 36, color: homeColors.ink },
  explanation: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 22, color: homeColors.body },
  caption: { fontFamily: "Inter-Regular", fontSize: 13, lineHeight: 18, color: homeColors.body },
  sectionTitle: { fontFamily: "Inter-SemiBold", fontSize: 13, lineHeight: 18, color: homeColors.body },

  // White group holding settings rows, and the hairline between them.
  group: { backgroundColor: homeColors.white, borderRadius: 20, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16, backgroundColor: homeColors.blue },

  card: { backgroundColor: homeColors.white, borderRadius: 20, padding: 16, gap: 12 },
  accentCard: { backgroundColor: homeColors.surface, borderWidth: 1, borderColor: homeColors.border,
    borderRadius: 20, padding: 16, gap: 12 },
  eyebrow: { fontFamily: "Inter-SemiBold", fontSize: 11, lineHeight: 15, color: homeColors.primary },
  cardValue: { fontFamily: "Nunito-ExtraBold", fontSize: 26, lineHeight: 33, color: homeColors.ink },
  cardBody: { fontFamily: "Inter-Regular", fontSize: 15, lineHeight: 21, color: homeColors.body },
  cardPill: { alignSelf: "flex-start", backgroundColor: homeColors.selected, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6 },
  cardPillLabel: { fontFamily: "Inter-Regular", fontSize: 13, lineHeight: 18, color: homeColors.primary },

  outlineButton: { minHeight: 54, borderRadius: 999, borderWidth: 1, borderColor: homeColors.primary,
    alignItems: "center", justifyContent: "center" },
  outlineButtonLabel: { fontFamily: "Inter-SemiBold", fontSize: 17, lineHeight: 24, color: homeColors.primary },
});
