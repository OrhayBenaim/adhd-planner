import { useState } from "react";
import { View } from "react-native";
import { BottomSheetBackdrop, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, { useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { TourTooltip } from "./TourTooltip";
import type { TourSheetUi } from "../../lib/guidedTourFlow";

export function ScheduleTourBackdrop({ tour, ...props }: BottomSheetBackdropProps & { tour: TourSheetUi | null }) {
  const [height, setHeight] = useState(180);
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => props.animatedIndex.value >= 0,
    (open, previous) => { if (open !== previous) scheduleOnRN(setVisible, open); },
  );
  const style = useAnimatedStyle(() => ({
    top: Math.max(12, props.animatedPosition.value - height - 16),
    opacity: props.animatedIndex.value < 0 ? 0 : 1,
  }));
  // A transparent backdrop can still intercept presses over Home or AddTask.
  // Mount it only once this sheet is open, including when the tour awaits it.
  if (!tour || !visible) return null;
  return <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1}
      opacity={0.32} pressBehavior={tour ? "none" : "close"} />
    {tour && <Animated.View pointerEvents="none" onLayout={e => setHeight(e.nativeEvent.layout.height)}
      style={[{ position: "absolute", left: 0, right: 0 }, style]}>
      <TourTooltip {...tour.tooltip} />
    </Animated.View>}
  </View>;
}
