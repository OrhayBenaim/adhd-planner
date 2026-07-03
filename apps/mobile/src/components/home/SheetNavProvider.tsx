// apps/mobile/src/components/home/SheetNavProvider.tsx
import { createContext, useContext, useCallback, useMemo, useRef, type ReactNode } from "react";
import type BottomSheet from "@gorhom/bottom-sheet";

export type ActiveSheet =
  | "none"
  | "addTask"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "preferences"
  | "taskSummary"
  | "profile"
  | "insights";

export type SheetEntry = { name: ActiveSheet; ref: React.RefObject<BottomSheet | null> };

interface SheetNavContextValue {
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  onSheetClose: () => void;
  registerSheet: (entry: SheetEntry) => void;
}

const SheetNavContext = createContext<SheetNavContextValue | null>(null);

export function useSheetNav() {
  const ctx = useContext(SheetNavContext);
  if (!ctx) throw new Error("useSheetNav must be used within SheetNavProvider");
  return ctx;
}

/**
 * Owns the bottom-sheet registry and navigation. SheetManager registers its
 * refs here; anything can open/close sheets without touching home data.
 */
export function SheetNavProvider({ children }: { children: ReactNode }) {
  const sheetsRef = useRef<Map<ActiveSheet, React.RefObject<BottomSheet | null>> | null>(null);
  sheetsRef.current ??= new Map();
  const sheets = sheetsRef.current;
  const activeSheetRef = useRef<ActiveSheet | null>(null);

  const registerSheet = useCallback((entry: SheetEntry) => {
    sheets.set(entry.name, entry.ref);
  }, [sheets]);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    activeSheetRef.current = sheet;
    sheets.forEach((ref, name) => {
      if (name !== sheet) ref.current?.close();
    });
    sheets.get(sheet)?.current?.expand();
  }, [sheets]);

  const closeSheet = useCallback(() => {
    activeSheetRef.current = null;
    sheets.forEach((ref) => ref.current?.close());
  }, [sheets]);

  // Guarded version for onClose callbacks — won't close a newly-opened sheet
  const onSheetClose = useCallback(() => {
    if (activeSheetRef.current === null) {
      closeSheet();
    }
  }, [closeSheet]);

  const value = useMemo(
    () => ({ openSheet, closeSheet, onSheetClose, registerSheet }),
    [openSheet, closeSheet, onSheetClose, registerSheet]
  );

  return (
    <SheetNavContext.Provider value={value}>
      {children}
    </SheetNavContext.Provider>
  );
}
