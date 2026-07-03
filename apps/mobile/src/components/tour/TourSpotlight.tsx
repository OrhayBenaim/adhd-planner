import { useEffect, useState } from "react";
import { View, Text, useWindowDimensions, type LayoutRectangle } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export const TOUR_SCRIM_COLOR = "rgba(15, 23, 42, 0.62)";

const CUTOUT_PADDING = 10;
const ARROW = 16;

interface Props {
  /** Target rect relative to the view this overlay is rendered in. */
  targetLayout: LayoutRectangle | null;
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  /** When set, shows a Next-style button; otherwise the user must tap the highlighted element. */
  buttonLabel?: string;
  onNext?: () => void;
  onSkip?: () => void;
  tooltipPosition?: "above" | "below";
}

/**
 * Coach-mark overlay: dims the whole screen except a cutout around the target,
 * draws a pulsing highlight ring, and anchors a tooltip with an arrow pointing
 * at the highlighted element. Touches only pass through inside the cutout.
 */
export function TourSpotlight({
  targetLayout,
  title,
  description,
  stepNumber,
  totalSteps,
  buttonLabel,
  onNext,
  onSkip,
  tooltipPosition = "below",
}: Props) {
  const screen = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }),
      -1
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.05 * pulse.value }],
  }));

  if (!targetLayout || targetLayout.width === 0) return null;

  const cutout = {
    x: targetLayout.x - CUTOUT_PADDING,
    y: targetLayout.y - CUTOUT_PADDING,
    width: targetLayout.width + CUTOUT_PADDING * 2,
    height: targetLayout.height + CUTOUT_PADDING * 2,
  };
  const radius = Math.min(28, cutout.height / 2);
  const targetCenterX = cutout.x + cutout.width / 2;
  const arrowLeft = Math.min(
    Math.max(targetCenterX - ARROW / 2, 44),
    screen.width - 44 - ARROW
  );
  const above = tooltipPosition === "above";

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-[900]"
      pointerEvents="box-none"
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {/* Scrim (4 pieces around the cutout; they block touches) */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.max(cutout.y, 0), backgroundColor: TOUR_SCRIM_COLOR }} />
      <View style={{ position: "absolute", top: cutout.y + cutout.height, left: 0, right: 0, bottom: 0, backgroundColor: TOUR_SCRIM_COLOR }} />
      <View style={{ position: "absolute", top: cutout.y, left: 0, width: Math.max(cutout.x, 0), height: cutout.height, backgroundColor: TOUR_SCRIM_COLOR }} />
      <View style={{ position: "absolute", top: cutout.y, left: cutout.x + cutout.width, right: 0, height: cutout.height, backgroundColor: TOUR_SCRIM_COLOR }} />

      {/* Pulsing glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          glowStyle,
          {
            position: "absolute",
            left: cutout.x - 5,
            top: cutout.y - 5,
            width: cutout.width + 10,
            height: cutout.height + 10,
            borderRadius: radius + 6,
            borderWidth: 3,
            borderColor: "#a2d2ff",
          },
        ]}
      />
      {/* Solid highlight border */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: cutout.x,
          top: cutout.y,
          width: cutout.width,
          height: cutout.height,
          borderRadius: radius,
          borderWidth: 2.5,
          borderColor: "#ffffff",
        }}
      />

      {/* Tooltip with arrow pointing at the target */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          ...(above
            ? { bottom: containerHeight - cutout.y + 12 }
            : { top: cutout.y + cutout.height + 12 }),
        }}
      >
        <View
          pointerEvents="box-none"
          style={above ? { paddingBottom: ARROW / 2 } : { paddingTop: ARROW / 2 }}
        >
          <View
            className="bg-white rounded-3xl px-6 py-5 mx-6"
            style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.25)" }}
          >
            <Text
              style={{ color: "#7bb8f0", fontSize: 12, fontWeight: "700", letterSpacing: 1.2 }}
            >
              STEP {stepNumber} OF {totalSteps}
            </Text>
            <Text className="text-xl font-semibold text-[#0A0A0A] mt-1 mb-2">{title}</Text>
            <Text className="text-base text-[#6A7282] leading-6">{description}</Text>

            {buttonLabel && onNext ? (
              <Pressable onPress={onNext} className="mt-4">
                <LinearGradient
                  colors={["#a2d2ff", "#cdb4db"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text className="text-white font-semibold text-base">{buttonLabel}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
                <View className="w-2 h-2 rounded-full bg-[#a2d2ff]" />
                <Text className="text-sm text-[#99a1af]">
                  Tap the highlighted area to continue
                </Text>
              </View>
            )}

            {onSkip && (
              <Pressable onPress={onSkip} className="items-center mt-3 py-1">
                <Text className="text-sm text-[#99a1af]">Skip tour</Text>
              </Pressable>
            )}
          </View>

          {/* Arrow (rotated square merged with the card edge) */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              ...(above ? { bottom: 0 } : { top: 0 }),
              left: arrowLeft,
              width: ARROW,
              height: ARROW,
              backgroundColor: "#ffffff",
              transform: [{ rotate: "45deg" }],
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}
