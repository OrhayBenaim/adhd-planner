import { useCallback, useEffect, useState } from "react";
import {
  markRatingPromptHandled,
  readRatingPromptHandled,
  readRatingPromptFirstSeenAt,
  writeRatingPromptFirstSeenAt,
} from "../lib/ratingPromptStorage";
import { canRateOnStore, openStoreReviewPage } from "../lib/storeLinks";

const RATING_PROMPT_WAIT_DAYS = 7;
const WAIT_MS = __DEV__ ? 0 : RATING_PROMPT_WAIT_DAYS * 24 * 60 * 60 * 1000;

export function useRatingPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const handled = await readRatingPromptHandled();
      let firstSeenAt = await readRatingPromptFirstSeenAt();
      if (firstSeenAt === null) {
        firstSeenAt = Date.now();
        await writeRatingPromptFirstSeenAt(firstSeenAt);
      }
      if (!cancelled) {
        setVisible(
          !handled && canRateOnStore() && Date.now() - firstSeenAt >= WAIT_MS,
        );
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
