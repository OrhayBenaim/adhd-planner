import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../animations/springs";

export type GradientPair = [string, string];

interface GradientOptionProps {
  label: string;
  colors: GradientPair;
  onPress: () => void;
  selected?: boolean;
}

export function GradientOption({ label, colors, onPress, selected }: GradientOptionProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <View style={{ position: "relative" }}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
          </LinearGradient>
          {selected && (
            <View
              className="absolute w-5 h-5 rounded-full bg-white items-center justify-center"
              style={{ top: -4, right: -4, boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.15)" }}
            >
              <Ionicons name="checkmark" size={14} color="#a2d2ff" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
