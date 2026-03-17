import { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
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
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    posthog.capture("onboarding_celebration_viewed");

    textOpacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_MS }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: FADE_OUT_MS }))
    );

    const timer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      <LottieView
        source={require("../../assets/animations/confetti.json")}
        autoPlay
        loop={false}
        style={styles.lottie}
      />
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.title}>Let's gooo!</Text>
        <Text style={styles.subtitle}>Time to crush it!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0A0A0A",
  },
  subtitle: {
    fontSize: 18,
    color: "#6A7282",
    marginTop: 4,
  },
});
