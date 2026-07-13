import { useCallback } from "react";
import { useAndroidRootBack } from "../../hooks/useAndroidBack";
import { ExitArmingToast } from "../ExitArmingToast";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { useSheetNav } from "./SheetNavProvider";

/** Android hardware back on Home — lives under GuidedTourProvider + SheetNavProvider. */
export function HomeBackHandler() {
  const { closeSheet, isSheetOpen } = useSheetNav();
  const guidedTour = useGuidedTour();

  const onDismiss = useCallback((): boolean => {
    if (guidedTour?.isActive) {
      guidedTour.skip();
      return true;
    }
    if (isSheetOpen()) {
      closeSheet();
      return true;
    }
    return false;
  }, [guidedTour, isSheetOpen, closeSheet]);

  const { exitToastVisible } = useAndroidRootBack(onDismiss);

  return <ExitArmingToast visible={exitToastVisible} />;
}
