// apps/mobile/src/components/home/SheetNavProvider.tsx
import { createContext, useContext, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
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
  activeSheet: ActiveSheet;
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  onSheetClose: (closed: ActiveSheet) => void;
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
  const activeSheetRef = useRef<ActiveSheet>("none");
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>("none");

  const registerSheet = useCallback((entry: SheetEntry) => {
    sheets.set(entry.name, entry.ref);
  }, [sheets]);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    activeSheetRef.current = sheet;
    setActiveSheet(sheet);
    sheets.forEach((ref, name) => {
      if (name !== sheet) ref.current?.close();
    });
    sheets.get(sheet)?.current?.expand();
  }, [sheets]);

  const closeSheet = useCallback(() => {
    activeSheetRef.current = "none";
    setActiveSheet("none");
    sheets.forEach((ref) => ref.current?.close());
  }, [sheets]);

  // Named so pan-down clears only when the dismissed sheet is still active;
  // transitions (openSheet already pointed at the next sheet) are ignored.
  const onSheetClose = useCallback((closed: ActiveSheet) => {
    if (activeSheetRef.current === closed) {
      activeSheetRef.current = "none";
      setActiveSheet("none");
    }
  }, []);

  const value = useMemo(
    () => ({ activeSheet, openSheet, closeSheet, onSheetClose, registerSheet }),
    [activeSheet, openSheet, closeSheet, onSheetClose, registerSheet]
  );

  return (
    <SheetNavContext.Provider value={value}>
      {children}
    </SheetNavContext.Provider>
  );
}
