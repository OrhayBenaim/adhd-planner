import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { AppPressable } from "../../../src/components/AppPressable";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { settingsColors as colors, settingsStyles as styles } from "../../../src/components/settings/theme";
import { useHome } from "../../../src/components/home/HomeProvider";

const GRID_GAP = 11;

export default function AchievementsRoute() {
  const { progress } = useHome();
  const definitions = useQuery(api.achievementDefs.listDefinitions);
  const unlocked = useQuery(api.achievementDefs.listUnlocked);
  const unlockedIds = new Set(unlocked?.map((a) => a.achievementId) ?? []);
  const [gridWidth, setGridWidth] = useState(0);
  const badgeWidth = (gridWidth - GRID_GAP * 2) / 3;

  return (
    <SettingsPage parent="Account" title="Achievements"
      explanation="Badges you pick up as you keep going. Pro unlocks the full set."
      note={"Locked badges show what to aim for next.\nTap a badge to see how to earn it."}>
      <View style={styles.accentCard}>
        <Text style={styles.eyebrow}>YOUR LEVEL</Text>
        <Text style={[styles.cardValue, { fontSize: 24, lineHeight: 31 }]}>
          Level {progress.level} · {progress.points} / {progress.pointsToNextLevel} XP
        </Text>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.selected, overflow: "hidden" }}>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.primary,
            width: `${Math.round(Math.min(progress.pointsToNextLevel > 0 ? progress.points / progress.pointsToNextLevel : 0, 1) * 100)}%` }} />
        </View>
      </View>

      <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
        {badgeWidth > 0 && definitions?.map((def) => {
          const earned = unlockedIds.has(def.id);
          return (
            <AppPressable key={def.id} accessibilityRole="button" accessibilityLabel={def.name}
              onPress={() => Alert.alert(def.name, def.description)}
              style={{ width: badgeWidth, minHeight: 120, backgroundColor: colors.white, borderRadius: 20,
                paddingHorizontal: 8, paddingVertical: 14, alignItems: "center", gap: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
                backgroundColor: earned ? colors.selected : colors.lockedDisc }}>
                <Ionicons name={def.icon as React.ComponentProps<typeof Ionicons>["name"]} size={26}
                  color={earned ? colors.primary : colors.lockedInk} />
              </View>
              <Text style={{ textAlign: "center", fontSize: 12, lineHeight: 16,
                fontFamily: earned ? "Inter-SemiBold" : "Inter-Regular",
                color: earned ? colors.ink : colors.lockedInk }}>{def.name}</Text>
            </AppPressable>
          );
        })}
      </View>
    </SettingsPage>
  );
}
