import { useCallback, useEffect, useState } from "react";
import {
  markRatingPromptHandled,
  readRatingPromptHandled,
} from "../lib/ratingPromptStorage";
import { canRateOnStore, openStoreReviewPage } from "../lib/storeLinks";

export function useRatingPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const handled = await readRatingPromptHandled();
      if (!cancelled) {
        setVisible(!handled && canRateOnStore());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRate = useCallback(async () => {
    await markRatingPromptHandled();
    setVisible(false);
    await openStoreReviewPage();
  }, []);

  const handleDismiss = useCallback(async () => {
    await markRatingPromptHandled();
    setVisible(false);
  }, []);

  return { visible, handleRate, handleDismiss };
}
