import { View, useWindowDimensions, type LayoutRectangle } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { TourTooltip } from "./TourTooltip";

const CUTOUT_PADDING = 12;

interface Props {
  targetLayout: LayoutRectangle | null;
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  tooltipPosition?: "above" | "below";
}

export function TourOverlay({
  targetLayout,
  title,
  description,
  buttonLabel,
  onPress,
  tooltipPosition = "below",
}: Props) {
  const screen = useWindowDimensions();

  if (!targetLayout) return null;

  const cutout = {
    x: targetLayout.x - CUTOUT_PADDING,
    y: targetLayout.y - CUTOUT_PADDING,
    width: targetLayout.width + CUTOUT_PADDING * 2,
    height: targetLayout.height + CUTOUT_PADDING * 2,
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-[900]"
      pointerEvents="box-none"
    >
      {/* Top blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: cutout.y,
        }}
      />
      {/* Bottom blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y + cutout.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Left blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y,
          left: 0,
          width: cutout.x,
          height: cutout.height,
        }}
      />
      {/* Right blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y,
          left: cutout.x + cutout.width,
          right: 0,
          height: cutout.height,
        }}
      />

      {/* Tooltip */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          ...(tooltipPosition === "above"
            ? { bottom: screen.height - cutout.y + 16 }
            : { top: cutout.y + cutout.height + 16 }),
        }}
      >
        <TourTooltip
          title={title}
          description={description}
          buttonLabel={buttonLabel}
          onPress={onPress}
        />
      </View>
    </Animated.View>
  );
}
