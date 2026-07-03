import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const dogRunning = require("../../assets/mascot/dog-running.png");
const ball = require("../../assets/mascot/ball.png");

const BOB_DURATION = 280;
const BALL_BOUNCE_DURATION = 340;

/** A single stylized paw print that fades in and out on a loop. */
function PawPrint({ delay, x, y, rotation }: { delay: number; x: number; y: number; rotation: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0.5, { duration: 500 }),
          withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 400 })
        ),
        -1
      )
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, transform: [{ rotate: `${rotation}deg` }] }, style]}
    >
      {/* Toes */}
      <View className="flex-row gap-[3px] mb-[2px]">
        <View className="w-[7px] h-[9px] rounded-full bg-[#cdb4db]" />
        <View className="w-[7px] h-[10px] rounded-full bg-[#cdb4db] -mt-[2px]" />
        <View className="w-[7px] h-[9px] rounded-full bg-[#cdb4db]" />
      </View>
      {/* Pad */}
      <View className="w-[16px] h-[13px] rounded-full bg-[#cdb4db] self-center" />
    </Animated.View>
  );
}

interface LoadingScreenProps {
  caption?: string;
}

/**
 * Full-screen loading state: the Lullio pekingese runs after a ball
 * that stays just out of reach. Uses no icon fonts so it can render
 * before fonts finish loading.
 */
export function LoadingScreen({ caption = "Fetching your day..." }: LoadingScreenProps) {
  const bob = useSharedValue(0); // 0 = ground, 1 = top of hop
  const ballBounce = useSharedValue(0); // 0 = top, 1 = ground

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BOB_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: BOB_DURATION, easing: Easing.in(Easing.quad) })
      ),
      -1
    );
    ballBounce.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BALL_BOUNCE_DURATION, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: BALL_BOUNCE_DURATION, easing: Easing.out(Easing.quad) })
      ),
      -1
    );
  }, [bob, ballBounce]);

  const dogStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -14 * bob.value },
      { rotate: `${-4 * bob.value}deg` },
      // Squash on landing, stretch mid-air
      { scaleY: 0.96 + 0.06 * bob.value },
      { scaleX: 1.02 - 0.04 * bob.value },
    ],
  }));

  const dogShadowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 - 0.1 * bob.value,
    transform: [{ scaleX: 1 - 0.15 * bob.value }],
  }));

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: 26 * ballBounce.value },
      { rotate: `${120 * ballBounce.value}deg` },
    ],
  }));

  const ballShadowStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + 0.14 * ballBounce.value,
    transform: [{ scaleX: 0.7 + 0.3 * ballBounce.value }],
  }));

  return (
    <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
      {/* Soft background blob */}
      <View className="absolute w-[320px] h-[320px] rounded-full bg-[#bde0fe]/20" />

      <View className="w-[300px] h-[220px]">
        {/* Paw prints trailing behind the dog */}
        <PawPrint delay={0} x={18} y={168} rotation={18} />
        <PawPrint delay={550} x={54} y={144} rotation={26} />
        <PawPrint delay={1100} x={34} y={112} rotation={12} />

        {/* Ball just ahead of the dog */}
        <Animated.View style={ballStyle} className="absolute right-[6px] top-[92px]">
          <Image source={ball} style={{ width: 38, height: 38 }} resizeMode="contain" />
        </Animated.View>
        <Animated.View
          style={ballShadowStyle}
          className="absolute right-[8px] top-[158px] w-[34px] h-[8px] rounded-full bg-[#0A0A0A]"
        />

        {/* Running dog */}
        <Animated.View style={dogStyle} className="absolute left-[52px] top-[30px]">
          <Image source={dogRunning} style={{ width: 200, height: 132 }} resizeMode="contain" />
        </Animated.View>
        <Animated.View
          style={dogShadowStyle}
          className="absolute left-[92px] top-[164px] w-[120px] h-[12px] rounded-full bg-[#0A0A0A]"
        />
      </View>

      <Text className="text-[#6A7282] text-base mt-6">{caption}</Text>
    </View>
  );
}
