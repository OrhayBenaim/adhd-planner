import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { UserProgress, xpPercent } from "../lib/points";
import { SPRING_XP_BAR, SPRING_BOUNCY } from "../animations/springs";

interface Props {
  progress: UserProgress;
  onLevelUp?: () => void;
}

export function XPBar({ progress }: Props) {
  const percent = xpPercent(progress);
  const barWidth = useSharedValue(percent);
  const trophyScale = useSharedValue(1);

  useEffect(() => {
    barWidth.value = withSpring(percent, SPRING_XP_BAR);
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as any,
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  return (
    <View
      className="mx-6 rounded-3xl px-4 pt-4 pb-3"
      style={{ backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
    >
      {/* Row: trophy + level info + next level */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Animated.View style={trophyStyle}>
            <View className="w-10 h-10 rounded-full bg-[#ffc8dd] items-center justify-center">
              <Text className="text-base">🏆</Text>
            </View>
          </Animated.View>
          <View>
            <Text className="text-sm font-semibold text-[#1e2939]">
              Level {progress.level}
            </Text>
            <Text className="text-xs text-[#6a7282]">{progress.points} points</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-xs text-[#6a7282]">Next level</Text>
          <Text className="text-sm font-semibold text-[#1e2939]">
            {progress.pointsToNextLevel - progress.points} pts
          </Text>
        </View>
      </View>

      {/* XP bar */}
      <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.5)" }}>
        <Animated.View style={[barStyle, { height: "100%", borderRadius: 9999, overflow: "hidden" }]}>
          <LinearGradient
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
