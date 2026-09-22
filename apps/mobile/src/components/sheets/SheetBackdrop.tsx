import { useState } from "react";
import { BottomSheetBackdrop, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { scrim } from "../home/theme";

// The scrim every bottom sheet dims the screen with while it is open.
export function SheetBackdrop({ pressBehavior = "close", ...props }: BottomSheetBackdropProps & { pressBehavior?: "close" | "none" }) {
  const [open, setOpen] = useState(false);
  useAnimatedReaction(
    () => props.animatedIndex.value >= 0,
    (onScreen, previous) => { if (onScreen !== previous) scheduleOnRN(setOpen, onScreen); },
  );
  // A closed backdrop still covers the screen and can keep intercepting presses
  // over Home and the tour overlays, so mount it only while the sheet shows.
  if (!open) return null;
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1}
    opacity={scrim.sheet} pressBehavior={pressBehavior} style={[props.style, { backgroundColor: scrim.color }]} />;
}
