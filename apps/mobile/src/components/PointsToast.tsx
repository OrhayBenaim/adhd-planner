import { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Text } from "react-native";

interface Props {
  points: number;
  visible: boolean;
  onDone: () => void;
}

export function PointsToast({ points, visible, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible) return;
    translateY.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(() => onDoneRef.current())();
      })
    );
    translateY.value = withTiming(-40, { duration: 1100 });
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={style}
      className="absolute top-0 self-center bg-white rounded-full px-4 py-1 shadow-sm"
    >
      <Text className="text-[#a2d2ff] font-semibold text-sm">+{points} pts</Text>
    </Animated.View>
  );
}
