import { useEffect } from "react";
import { Accelerometer } from "expo-sensors";
import { accelerometerXToTiltPx } from "../lib/headerDogMotion";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function useHeaderDogMotion() {
  const idle = useSharedValue(0);
  const tiltX = useSharedValue(0);

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
      subscription = Accelerometer.addListener(({ x }) => {
        tiltX.value = accelerometerXToTiltPx(x);
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [tiltX]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value },
      { translateY: -2 * idle.value },
      { scaleX: -1 },
    ],
  }));
}
