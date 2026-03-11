# Preferences Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Preferences button to BottomNav that opens a tabbed sheet for editing onboarding preferences (name, work times, difficulties, strengths).

**Architecture:** New `PreferencesSheet` with a `SegmentedControl` component, reusing onboarding's `ChipGrid` and toggle-button patterns. New Convex `preferences.update` mutation for patching fields. Sheet registered in the existing `SheetManager` system.

**Tech Stack:** React Native, Expo, @gorhom/bottom-sheet, Reanimated, NativeWind, Convex

---

### Task 1: Add `preferences.update` Convex mutation

**Files:**
- Modify: `apps/convex/convex/preferences.ts`

**Step 1: Add the `update` mutation after the existing `save` mutation**

All fields are optional — only provided fields get patched. Reuses existing validation helpers. Does NOT touch `onboardingCompleted`.

```typescript
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    bestWorkTimes: v.optional(v.array(v.string())),
    difficulties: v.optional(v.array(v.string())),
    strengths: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) throw new ConvexError("No preferences found");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      assertMaxLength(args.name, MAX_NAME, "name");
      patch.name = args.name;
    }
    if (args.bestWorkTimes !== undefined) {
      assertArrayLimits(args.bestWorkTimes, MAX_PREF_ARRAY, MAX_PREF_ITEM, "bestWorkTimes");
      patch.bestWorkTimes = args.bestWorkTimes;
    }
    if (args.difficulties !== undefined) {
      assertArrayLimits(args.difficulties, MAX_PREF_ARRAY, MAX_PREF_ITEM, "difficulties");
      patch.difficulties = args.difficulties;
    }
    if (args.strengths !== undefined) {
      assertArrayLimits(args.strengths, MAX_PREF_ARRAY, MAX_PREF_ITEM, "strengths");
      patch.strengths = args.strengths;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/preferences.ts
git commit -m "feat: add preferences.update mutation for post-onboarding editing"
```

---

### Task 2: Add `useUpdatePreferences` hook

**Files:**
- Modify: `apps/mobile/src/hooks/usePreferences.ts`

**Step 1: Add the hook**

Add after the existing `useSavePreferences`:

```typescript
export function useUpdatePreferences() {
  return useMutation(api.preferences.update);
}

export function usePreferences() {
  return useQuery(api.preferences.get);
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/hooks/usePreferences.ts
git commit -m "feat: add useUpdatePreferences and usePreferences hooks"
```

---

### Task 3: Create `SegmentedControl` component

**Files:**
- Create: `apps/mobile/src/components/SegmentedControl.tsx`

**Step 1: Create the component**

A row of tab buttons. The active tab gets a filled background color; inactive tabs are neutral. Each segment has a label string and a color.

```typescript
import { View, Text, Pressable } from "react-native";

interface Segment {
  label: string;
  color: string;
}

interface Props {
  segments: Segment[];
  activeIndex: number;
  onPress: (index: number) => void;
}

export function SegmentedControl({ segments, activeIndex, onPress }: Props) {
  return (
    <View className="flex-row bg-[#f3f4f6] rounded-2xl p-1">
      {segments.map((seg, i) => {
        const isActive = i === activeIndex;
        return (
          <Pressable
            key={seg.label}
            onPress={() => onPress(i)}
            className="flex-1 py-2.5 rounded-xl items-center justify-center"
            style={isActive ? { backgroundColor: seg.color } : undefined}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: isActive ? "#fff" : "#6a7282" }}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/SegmentedControl.tsx
git commit -m "feat: add reusable SegmentedControl component"
```

---

### Task 4: Create `PreferencesSheet` component

**Files:**
- Create: `apps/mobile/src/components/sheets/PreferencesSheet.tsx`

**Step 1: Create the sheet**

This is the main sheet with the segmented control and 4 tab views. It:
- Fetches current preferences via `usePreferences()`
- Holds local state for all 4 fields
- Auto-saves changes on tab switch and sheet close via `useUpdatePreferences()`
- Reuses `ChipGrid` for difficulties/strengths
- Reuses the toggle-button pattern from onboarding for work times

```typescript
import { forwardRef, useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { AppPressable } from "../AppPressable";
import { SegmentedControl } from "../SegmentedControl";
import { ChipGrid } from "../onboarding/ChipGrid";
import { usePreferences, useUpdatePreferences } from "../../hooks/usePreferences";
import { useHome } from "../home/HomeProvider";
import { PRODUCTIVE_TIMES, DIFFICULTIES, STRENGTHS } from "../../constants/onboarding";

const SEGMENTS = [
  { label: "Name", color: "#ffc8dd" },
  { label: "Times", color: "#cdb4db" },
  { label: "Difficulties", color: "#ffafcc" },
  { label: "Strengths", color: "#a2d2ff" },
];

interface Props {
  onClose: () => void;
}

export const PreferencesSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const preferences = usePreferences();
    const updatePreferences = useUpdatePreferences();

    const [activeTab, setActiveTab] = useState(0);
    const [name, setName] = useState("");
    const [bestWorkTimes, setBestWorkTimes] = useState<string[]>([]);
    const [difficulties, setDifficulties] = useState<string[]>([]);
    const [strengths, setStrengths] = useState<string[]>([]);

    // Track what was last saved to avoid unnecessary mutations
    const savedRef = useRef({ name: "", bestWorkTimes: [] as string[], difficulties: [] as string[], strengths: [] as string[] });

    // Populate local state when preferences load
    useEffect(() => {
      if (preferences) {
        setName(preferences.name);
        setBestWorkTimes(preferences.bestWorkTimes);
        setDifficulties(preferences.difficulties);
        setStrengths(preferences.strengths);
        savedRef.current = {
          name: preferences.name,
          bestWorkTimes: preferences.bestWorkTimes,
          difficulties: preferences.difficulties,
          strengths: preferences.strengths,
        };
      }
    }, [preferences]);

    // Auto-save: compare current state with saved state and patch if changed
    const autoSave = useCallback(() => {
      const saved = savedRef.current;
      const patch: Record<string, unknown> = {};

      if (name !== saved.name) patch.name = name;
      if (JSON.stringify(bestWorkTimes) !== JSON.stringify(saved.bestWorkTimes))
        patch.bestWorkTimes = bestWorkTimes;
      if (JSON.stringify(difficulties) !== JSON.stringify(saved.difficulties))
        patch.difficulties = difficulties;
      if (JSON.stringify(strengths) !== JSON.stringify(saved.strengths))
        patch.strengths = strengths;

      if (Object.keys(patch).length > 0) {
        updatePreferences(patch);
        savedRef.current = { name, bestWorkTimes, difficulties, strengths };
      }
    }, [name, bestWorkTimes, difficulties, strengths, updatePreferences]);

    // Auto-save on tab switch
    const handleTabChange = useCallback(
      (index: number) => {
        autoSave();
        setActiveTab(index);
      },
      [autoSave]
    );

    // Auto-save on sheet close
    const handleClose = useCallback(() => {
      autoSave();
      onClose();
    }, [autoSave, onClose]);

    const toggleWorkTime = useCallback((label: string) => {
      setBestWorkTimes((prev) =>
        prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
      );
    }, []);

    const toggleDifficulty = useCallback((label: string) => {
      setDifficulties((prev) =>
        prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label]
      );
    }, []);

    const toggleStrength = useCallback((label: string) => {
      setStrengths((prev) =>
        prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
      );
    }, []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["85%"]}
        enablePanDownToClose
        onClose={handleClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <View className="px-6 pt-6 pb-3">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-medium text-[#1e2939]">My Preferences</Text>
            <AppPressable onPress={closeSheet}>
              <Ionicons name="close" size={24} color="#364153" />
            </AppPressable>
          </View>
          <SegmentedControl
            segments={SEGMENTS}
            activeIndex={activeTab}
            onPress={handleTabChange}
          />
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {activeTab === 0 && (
            <View className="items-center pt-8">
              <View className="w-20 h-20 rounded-full bg-[#ffc8dd]/20 items-center justify-center mb-6">
                <Ionicons name="person" size={36} color="#ffc8dd" />
              </View>
              <Text className="text-base font-medium text-[#4a5565] mb-4">
                What should we call you?
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
                className="w-full text-center text-xl font-semibold text-[#1e2939] bg-[#f5f7fa] rounded-2xl px-4 py-4"
              />
            </View>
          )}

          {activeTab === 1 && (
            <View className="pt-4 gap-3">
              {PRODUCTIVE_TIMES.map((time) => {
                const isSelected = bestWorkTimes.includes(time.label);
                return isSelected ? (
                  <Pressable key={time.id} onPress={() => toggleWorkTime(time.label)}>
                    <LinearGradient
                      colors={["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-3xl px-5 py-5"
                      style={{ borderWidth: 1.5, borderColor: "#a2d2ff" }}
                    >
                      <Text className="text-base font-medium text-[#1e2939]">
                        {time.label}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable
                    key={time.id}
                    onPress={() => toggleWorkTime(time.label)}
                    className="rounded-3xl px-5 py-5"
                    style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
                  >
                    <Text className="text-base font-medium text-[#364153]">
                      {time.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {activeTab === 2 && (
            <View className="pt-4">
              <ChipGrid
                items={DIFFICULTIES}
                selected={difficulties}
                onToggle={toggleDifficulty}
                variant="difficulties"
              />
            </View>
          )}

          {activeTab === 3 && (
            <View className="pt-4">
              <ChipGrid
                items={STRENGTHS}
                selected={strengths}
                onToggle={toggleStrength}
                variant="strengths"
              />
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/PreferencesSheet.tsx
git commit -m "feat: add PreferencesSheet with tabbed UI for editing preferences"
```

---

### Task 5: Register preferences sheet in SheetManager

**Files:**
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Add import, ref, registration, and render**

Add import at top:
```typescript
import { PreferencesSheet } from "../sheets/PreferencesSheet";
```

Add ref alongside existing refs:
```typescript
const preferencesSheetRef = useRef<BottomSheet>(null);
```

Add registration inside the `useEffect`:
```typescript
registerSheet({ name: "preferences", ref: preferencesSheetRef });
```

Add render in the JSX return:
```typescript
<PreferencesSheet ref={preferencesSheetRef} onClose={onSheetClose} />
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/SheetManager.tsx
git commit -m "feat: register PreferencesSheet in SheetManager"
```

---

### Task 6: Add "preferences" to ActiveSheet type in HomeProvider

**Files:**
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Update the ActiveSheet type**

Change:
```typescript
export type ActiveSheet =
  | "none"
  | "addTask"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "taskSummary";
```

To:
```typescript
export type ActiveSheet =
  | "none"
  | "addTask"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "preferences"
  | "taskSummary";
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: add preferences to ActiveSheet type"
```

---

### Task 7: Add Preferences button to BottomNav

**Files:**
- Modify: `apps/mobile/src/components/BottomNav.tsx`
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Update BottomNav props and layout**

Add `onPreferencesPress` prop:
```typescript
interface Props {
  onListPress: () => void;
  onPreferencesPress: () => void;
  onAddPress: () => void;
  onSettingsPress: () => void;
}
```

Update the component to render 4 buttons. The order is: Tasks, Preferences, Add (gradient center), Settings. Reduce `gap-16` to `gap-6` to fit 4 buttons:

```typescript
export function BottomNav({ onListPress, onPreferencesPress, onAddPress, onSettingsPress }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[#f3f4f6] px-6 pt-6 pb-8">
      <View className="flex-row items-center justify-center gap-6">
        <NavButton onPress={onListPress}>
          <Ionicons name="list-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onPreferencesPress}>
          <Ionicons name="person-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onAddPress} gradient>
          <Ionicons name="add" size={28} color="#fff" />
        </NavButton>

        <NavButton onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={24} color="#364153" />
        </NavButton>
      </View>
    </View>
  );
}
```

**Step 2: Wire up in MainContent.tsx**

Find the `<BottomNav` usage (around line 165) and add the new prop:

```typescript
<BottomNav
  onListPress={() => openSheet("allTasks")}
  onPreferencesPress={() => openSheet("preferences")}
  onAddPress={() => flow.start("addTask")}
  onSettingsPress={() => openSheet("settings")}
/>
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/BottomNav.tsx apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: add Preferences button to BottomNav"
```

---

### Task 8: Verify end-to-end

**Step 1: Run TypeScript type check**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No type errors.

**Step 2: Run Convex type generation**

```bash
cd apps/convex && npx convex dev --once
```

Expected: Types regenerated, `api.d.ts` includes `preferences.update`.

**Step 3: Manual test checklist**

- [ ] BottomNav shows 4 buttons: Tasks, Person, Add (gradient), Settings
- [ ] Tapping person icon opens PreferencesSheet at 85%
- [ ] Segmented control shows 4 tabs with correct colors
- [ ] Name tab shows pre-filled name in text input
- [ ] Times tab shows toggle buttons with current selections
- [ ] Difficulties tab shows chip grid with current selections
- [ ] Strengths tab shows chip grid with current selections
- [ ] Toggling chips/times updates selections
- [ ] Switching tabs saves changes (verify in Convex dashboard)
- [ ] Closing sheet saves changes
- [ ] Re-opening sheet shows saved changes

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: preferences tab - complete implementation"
```
