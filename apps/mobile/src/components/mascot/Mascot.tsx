import { useEffect } from "react";
import { Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const POSES = {
  wave: require("../../../assets/mascot/dog-wave.png"),
  running: require("../../../assets/mascot/dog-running.png"),
  celebrate: require("../../../assets/mascot/dog-celebrate.png"),
} as const;

export type MascotPose = keyof typeof POSES;

interface MascotProps {
  pose: MascotPose;
  size?: number;
  /** Gentle idle bob + sway. Defaults to true. */
  animated?: boolean;
}

/** The Lullio pekingese, with an optional gentle idle animation. */
export function Mascot({ pose, size = 140, animated = true }: MascotProps) {
  const idle = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [animated, idle]);

  const idleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -4 * idle.value },
      { rotate: `${1.5 * idle.value - 0.75}deg` },
    ],
  }));

  return (
    <Animated.View style={animated ? idleStyle : undefined}>
      <Image
        source={POSES[pose]}
        style={{ width: size, height: size * (427 / 640) }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
