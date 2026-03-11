import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import type { UserProgress } from "@adhd-planner/types";

interface Props {
  progress: UserProgress;
}

export function XPBar({ progress }: Props) {
  const percent = Math.min(progress.points / progress.pointsToNextLevel, 1);

  const barWidth = useDerivedValue(() =>
    withTiming(percent, { duration: 600, easing: Easing.out(Easing.quad) })
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as any,
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
          <View>
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
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
          </View>
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
