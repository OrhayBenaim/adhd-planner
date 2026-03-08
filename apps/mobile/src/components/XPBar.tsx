import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { UserProgress, xpPercent } from "../lib/points";
import { SPRING_XP_BAR, SPRING_BOUNCY } from "../animations/springs";

interface Props {
  progress: UserProgress;
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
    <LinearGradient
      colors={["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"]}
      start={{ x: 0.8, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={{ marginHorizontal: 24, borderRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
    >
      {/* Row: trophy + level info + next level */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Animated.View style={trophyStyle}>
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
              }}
            >
              <LinearGradient
                colors={["#ffc8dd", "#ffafcc"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="trophy" size={18} color="#fff" />
              </LinearGradient>
            </View>
          </Animated.View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e2939" }}>Level {progress.level}</Text>
            <Text style={{ fontSize: 12, color: "#6a7282" }}>{progress.points} points</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, color: "#6a7282" }}>Next level</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e2939" }}>
            {progress.pointsToNextLevel - progress.points} pts
          </Text>
        </View>
      </View>

      {/* XP bar track */}
      <View style={{ height: 12, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.5)", overflow: "hidden" }}>
        <Animated.View style={[barStyle, { height: "100%", borderRadius: 9999, overflow: "hidden" }]}>
          <LinearGradient
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}
