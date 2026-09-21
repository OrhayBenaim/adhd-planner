import { useState } from "react";
import { View, type LayoutRectangle } from "react-native";
import { TourTooltip } from "./TourTooltip";
import { getTourTooltipTop } from "../../lib/tourLayout";

export const TOUR_SCRIM_COLOR = "rgba(54, 24, 43, 0.44)";
interface Props {
  targetLayout: LayoutRectangle | null;
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  buttonLabel?: string;
  onNext?: () => void;
  onSkip?: () => void;
  tooltipPosition?: "above" | "below";
}
export function TourSpotlight({ targetLayout, title, description, stepNumber, totalSteps, buttonLabel, onNext, tooltipPosition = "below" }: Props) {
  const [height, setHeight] = useState(0);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  if (!targetLayout || !targetLayout.width) return null;
  const cutout = { x: Math.max(0, targetLayout.x - 4), y: Math.max(0, targetLayout.y - 4), width: targetLayout.width + 8, height: targetLayout.height + 8 };
  const top = getTourTooltipTop(cutout, tooltipHeight, height, tooltipPosition);
  return <View pointerEvents="box-none" style={{ position: "absolute", inset: 0, zIndex: 900 }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: cutout.y, backgroundColor: TOUR_SCRIM_COLOR }} />
    <View style={{ position: "absolute", top: cutout.y + cutout.height, left: 0, right: 0, bottom: 0, backgroundColor: TOUR_SCRIM_COLOR }} />
    <View style={{ position: "absolute", top: cutout.y, left: 0, width: cutout.x, height: cutout.height, backgroundColor: TOUR_SCRIM_COLOR }} />
    <View style={{ position: "absolute", top: cutout.y, left: cutout.x + cutout.width, right: 0, height: cutout.height, backgroundColor: TOUR_SCRIM_COLOR }} />
    <View pointerEvents="none" style={{ position: "absolute", left: cutout.x, top: cutout.y, width: cutout.width, height: cutout.height, borderRadius: 20, borderWidth: 3, borderColor: "#ffe4ef" }} />
    <View style={{ position: "absolute", left: 0, right: 0, top, opacity: height && tooltipHeight ? 1 : 0 }} onLayout={e => setTooltipHeight(e.nativeEvent.layout.height)}>
      <TourTooltip title={title} description={description} stepNumber={stepNumber} totalSteps={totalSteps} buttonLabel={buttonLabel} onPress={onNext} />
    </View>
  </View>;
}
