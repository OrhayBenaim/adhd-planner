import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { posthog } from "../lib/posthog";

interface CelebrationOverlayProps {
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 3000;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 500;
const VISIBLE_MS = TOTAL_DURATION_MS - FADE_IN_MS - FADE_OUT_MS;

export function CelebrationOverlay({ onComplete }: CelebrationOverlayProps) {
  const overlayOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    posthog.capture("onboarding_celebration_viewed");

    textOpacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_MS }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: FADE_OUT_MS }))
    );

    // Fade out the entire overlay before unmounting
    overlayOpacity.value = withDelay(
      TOTAL_DURATION_MS - FADE_OUT_MS,
      withTiming(0, { duration: FADE_OUT_MS })
    );

    const timer = setTimeout(onComplete, TOTAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View
      className="absolute inset-0 z-[999] items-center justify-center bg-white"
      style={overlayStyle}
      pointerEvents="none"
    >
      <LottieView
        source={require("../../assets/animations/confetti.json")}
        autoPlay
        loop={false}
        style={{
          position: "absolute",
          width: "150%",
          height: "150%",
          alignSelf: "center",
          top: "-25%",
          left: "-25%",
        }}
      />
      <Animated.View className="items-center" style={textStyle}>
        <Text className="text-[32px] font-bold text-[#0A0A0A]">
          Let's gooo!
        </Text>
        <Text className="mt-1 text-lg text-[#6A7282]">Time to crush it!</Text>
      </Animated.View>
    </Animated.View>
  );
}
