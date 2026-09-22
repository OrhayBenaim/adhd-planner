import { useState } from "react";
import { View } from "react-native";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, { useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SheetBackdrop } from "../sheets/SheetBackdrop";
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
  return <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
    <SheetBackdrop {...props} pressBehavior={tour ? "none" : "close"} />
    {/* The tooltip floats above the sheet, so mount it only once the sheet is open. */}
    {tour && visible && <Animated.View pointerEvents="none" onLayout={e => setHeight(e.nativeEvent.layout.height)}
      style={[{ position: "absolute", left: 0, right: 0 }, style]}>
      <TourTooltip {...tour.tooltip} />
    </Animated.View>}
  </View>;
}
