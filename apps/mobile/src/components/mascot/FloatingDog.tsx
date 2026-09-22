import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { Accelerometer } from "expo-sensors";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { stepFloat, waveSurfaceY } from "../../lib/headerDogMotion";

const WIDTH = 98;
const HEIGHT = 65;

/** `right` is the dog's resting inset, so it can drift to either screen edge. */
function useFloatMotion(right: number) {
  const screen = useWindowDimensions();
  const idle = useSharedValue(0);
  const tilt = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const velocityX = useSharedValue(0);

  const bounds = useSharedValue({ min: -(screen.width - right - WIDTH), max: right });

  useEffect(() => {
    bounds.value = { min: -(screen.width - right - WIDTH), max: right };
  }, [bounds, screen.width, right]);

  useEffect(() => {
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [idle]);

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;

    void Accelerometer.isAvailableAsync().then((available) => {
      if (!active || !available) return;
      Accelerometer.setUpdateInterval(32);
      // Sensor x is positive when the left side dips, so negate to slide downhill.
      subscription = Accelerometer.addListener(({ x }) => {
        tilt.value = -x;
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [tilt]);

  // Where the dog sits on the wave at rest, so riding the curve is relative to it.
  const restCenterX = screen.width - right - WIDTH / 2;
  const restWaveY = waveSurfaceY(restCenterX / screen.width);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const next = stepFloat({ x: offsetX.value, v: velocityX.value }, tilt.value, dt, bounds.value);
    offsetX.value = next.x;
    velocityX.value = next.v;
  });

  return useAnimatedStyle(() => {
    const ride = waveSurfaceY((restCenterX + offsetX.value) / screen.width) - restWaveY;

    return { transform: [
      { translateX: offsetX.value },
      { translateY: ride - 2 * idle.value },
      { rotateZ: `${Math.max(-10, Math.min(10, velocityX.value * 0.03))}deg` },
      { scaleX: -1 },
    ] };
  });
}

/**
 * The mascot floating on a wave divider: it drifts with the device tilt, rides
 * the wave's curve as it goes and bobs on the spot. Position it against the
 * bottom edge of the wave strip it floats on.
 */
export function FloatingDog({ right, bottom }: { right: number; bottom: number }) {
  const motion = useFloatMotion(right);

  // It drifts over the header's controls, so the wrapper turns off touches.
  return (
    <View pointerEvents="none" style={{ position: "absolute", right, bottom, width: WIDTH, height: HEIGHT }}>
      <Animated.Image source={require("../../../assets/mascot/dog-floating.png")} resizeMode="contain"
        style={[{ width: WIDTH, height: HEIGHT }, motion]} />
    </View>
  );
}
