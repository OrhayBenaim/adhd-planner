import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { Mascot } from "../mascot/Mascot";
import { usePreferences } from "../../hooks/usePreferences";

interface Props {
  onStart: () => void;
  onSkip: () => void;
}

export function TourIntroCard({ onStart, onSkip }: Props) {
  const preferences = usePreferences();
  const firstName = preferences?.name?.trim().split(" ")[0];

  return (
    <Animated.View entering={FadeIn.duration(400)} className="mx-6">
      <View className="items-center z-10" style={{ marginBottom: -20 }}>
        <Mascot pose="wave" size={130} />
      </View>
      <View
        className="bg-white rounded-3xl px-6 py-6"
        style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)" }}
      >
        <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2 mt-2">
          {firstName ? `This is your home, ${firstName}!` : "This is your home!"}
        </Text>
        <Text className="text-base text-[#6A7282] text-center mb-5">
          Let's set up your first task together. It'll take 30 seconds.
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
      </View>
    </Animated.View>
  );
}
