import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { UserProgress } from "@adhd-planner/types";
import { homeColors, homeStyles } from "./home/theme";

export function XPBar({ progress }: { progress: UserProgress }) {
  const percent = progress.pointsToNextLevel > 0 ? Math.max(0, Math.min(progress.points / progress.pointsToNextLevel, 1)) : 0;
  const barStyle = useAnimatedStyle(() => ({ width: withTiming(`${percent * 100}%` as `${number}%`, { duration: 600 }) }));
  return <View style={{ flex: 1 }} accessibilityLabel={`Level ${progress.level}, ${progress.points} of ${progress.pointsToNextLevel} XP`}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={[homeStyles.heading, { fontSize: 18, lineHeight: 23 }]}>Level {progress.level}</Text>
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: homeColors.selected, overflow: "hidden" }}>
        <Animated.View style={[barStyle, { height: 8, borderRadius: 4, backgroundColor: homeColors.accent }]} />
      </View>
    </View>
    <Text style={[homeStyles.caption, { fontSize: 11, lineHeight: 13, textAlign: "right" }]}>{progress.points} / {progress.pointsToNextLevel} XP</Text>
  </View>;
}
