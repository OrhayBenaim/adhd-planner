import { useEffect } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Mascot } from "../mascot/Mascot";
import { usePreferences } from "../../hooks/usePreferences";
import { posthog } from "../../lib/posthog";

interface Props {
  onFinish: () => void;
}

export function TourCelebration({ onFinish }: Props) {
  const preferences = usePreferences();
  const firstName = preferences?.name?.trim().split(" ")[0];

  useEffect(() => {
    posthog.capture("onboarding_celebration_viewed");
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 z-[900] items-center justify-center"
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LottieView
        source={require("../../../assets/animations/confetti.json")}
        autoPlay
        loop={false}
        style={{
          position: "absolute",
          pointerEvents: "none",
          width: "150%",
          height: "150%",
          alignSelf: "center",
          top: "-25%",
          left: "-25%",
        }}
      />

      <Animated.View entering={FadeInDown.duration(400).delay(150)} className="mx-6 w-full max-w-[360px] px-6">
        <View className="items-center z-10" style={{ marginBottom: -24 }}>
          <Mascot pose="celebrate" size={180} />
        </View>
        <View
          className="bg-white rounded-3xl px-6 py-6"
          style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)" }}
        >
          <Text className="text-2xl font-bold text-[#0A0A0A] text-center mb-2 mt-3">
            {firstName ? `You did it, ${firstName}!` : "You did it!"}
          </Text>
          <Text className="text-base text-[#6A7282] text-center leading-6">
            That's the whole loop. Add tasks, match your mood, and get things done.
          </Text>
          <Text className="text-sm text-[#99a1af] text-center mt-3 leading-5">
            Pro members also get AI coaching, streak tracking, and personalized reminders.
          </Text>
          <Pressable onPress={onFinish} className="mt-5">
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
            >
              <Text className="text-white font-semibold text-base">Let's start!</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
