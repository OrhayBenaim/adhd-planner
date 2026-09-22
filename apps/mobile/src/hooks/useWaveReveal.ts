import { useCallback } from "react";
import { router } from "expo-router";
import type { LayoutChangeEvent } from "react-native";
import {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Height of HomeHeader — where the blue starts before it slides down. */
const HEADER_HEIGHT = 76;
const DURATION = 420;

function goBack() {
  router.back();
}

/**
 * Settings opens by letting the home header's blue wave run down the screen,
 * and closes by letting it run back up. Detail screens pass `animated: false`
 * and get the same surface at full height with a plain back.
 */
export function useWaveReveal(animated: boolean) {
  const progress = useSharedValue(animated ? 0 : 1);
  const full = useSharedValue(0);

  const close = useCallback(() => {
    if (!animated) return goBack();
    progress.value = withTiming(0, { duration: DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
      "worklet";
      if (finished) scheduleOnRN(goBack);
    });
  }, [animated, progress]);

  // The surface is absolutely placed, so it needs the window height measured
  // from the root rather than Dimensions, which disagrees about system bars.
  // The wave only starts running once that height is known.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    if (full.value === height) return;
    const first = full.value === 0;
    full.value = height;
    if (animated && first) {
      progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    }
  }, [animated, full, progress]);

  const surfaceStyle = useAnimatedStyle(() => ({
    height: full.value === 0 ? HEADER_HEIGHT : interpolate(progress.value, [0, 1], [HEADER_HEIGHT, full.value]),
  }));

  // Rows fade in once the wave is most of the way down, not while it passes them.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 1], [0, 1], "clamp"),
  }));

  return { onLayout, surfaceStyle, contentStyle, close };
}
