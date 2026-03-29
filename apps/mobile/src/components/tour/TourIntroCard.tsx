import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

interface Props {
  onStart: () => void;
  onSkip: () => void;
}

export function TourIntroCard({ onStart, onSkip }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="bg-white rounded-3xl px-6 py-6 mx-6"
      style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)" }}
    >
      <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2">
        Let me show you around
      </Text>
      <Text className="text-base text-[#6A7282] text-center mb-5">
        It'll take 30 seconds.
      </Text>
      <Pressable onPress={onStart}>
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
        >
          <Text className="text-white font-semibold text-base">Let's go</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={onSkip} className="mt-3 items-center py-2">
        <Text className="text-sm text-[#99a1af]">Skip</Text>
      </Pressable>
    </Animated.View>
  );
}
