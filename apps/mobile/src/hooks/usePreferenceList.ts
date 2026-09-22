import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences, useUpdatePreferences } from "./usePreferences";

type ListField = "bestWorkTimes" | "difficulties" | "strengths";

/**
 * One multi-select preference list, edited locally and written back when the
 * user leaves the screen — the settings detail screens have no save button.
 */
export function usePreferenceList(field: ListField) {
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const saved = preferences?.[field] ?? [];
  const [edits, setEdits] = useState<string[] | null>(null);
  const selected = edits ?? saved;

  const toggle = useCallback((label: string) => {
    setEdits((current) => {
      const list = current ?? saved;
      return list.includes(label) ? list.filter((v) => v !== label) : [...list, label];
    });
  }, [saved]);

  const save = useCallback(() => {
    if (edits && JSON.stringify(edits) !== JSON.stringify(saved)) {
      updatePreferences({ [field]: edits });
    }
  }, [edits, saved, field, updatePreferences]);

  // Saving on unmount also covers the iOS swipe-back, which never hits the
  // screen's own back control.
  const latest = useRef(save);
  latest.current = save;
  useEffect(() => () => latest.current(), []);

  return { selected, toggle };
}
