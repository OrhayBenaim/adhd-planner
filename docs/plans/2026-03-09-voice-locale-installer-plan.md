# Voice Locale Installer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Android-only setting in SettingsSheet that lets users browse and install speech recognition locale models.

**Architecture:** New `VoiceLanguages` component inside SettingsSheet with inline expandable locale list. Uses `ExpoSpeechRecognitionModule.getSupportedLocales()` to fetch available/installed locales and `androidTriggerOfflineModelDownload()` to install them. No persistence — purely on-device. Also cleans up unused `sttModel`/`sttLocale` fields.

**Tech Stack:** React Native, expo-speech-recognition, @gorhom/bottom-sheet, nativewind, Ionicons, Convex

**API note:** `androidTriggerOfflineModelDownload` returns a Promise (no progress events). Use an indeterminate loading indicator (ActivityIndicator) per downloading locale, not a progress bar.

---

### Task 1: Remove sttModel from useSettings hook

**Files:**
- Modify: `apps/mobile/src/hooks/useSettings.ts`

**Step 1: Remove sttModel from interfaces and reducer**

Remove `sttModel` from `Settings` interface (line 13), `LocalSettings` interface (line 26), `stt_model` from `SettingsAction` union (line 34), `sttModel` from `initialState` (line 40), the `stt_model` case in reducer (lines 65-68), `sttModel` from settings object (line 111), and the `sttModel` branch in `updateSetting` (lines 138-139).

```typescript
// Settings interface becomes:
export interface Settings {
  notifications: boolean;
  soundEffects: boolean;
  smartScheduling: boolean;
}

// LocalSettings becomes:
interface LocalSettings {
  notificationsDesired: boolean;
  notificationsGranted: boolean;
  soundEffects: boolean;
}

// SettingsAction — remove the stt_model variant:
type SettingsAction =
  | { type: "loaded"; stored: Partial<LocalSettings>; granted: boolean }
  | { type: "notifications_requested"; granted: boolean }
  | { type: "notifications_disabled" }
  | { type: "sound"; enabled: boolean };

// initialState — remove sttModel:
const initialState: LocalSettings = {
  notificationsDesired: true,
  notificationsGranted: false,
  soundEffects: true,
};

// settingsReducer — remove the stt_model case entirely
// Also remove sttModel from the "loaded" case:
case "loaded":
  changedState = {
    notificationsDesired: action.stored.notificationsDesired ?? true,
    notificationsGranted: action.granted,
    soundEffects: action.stored.soundEffects ?? true,
  };
  break;

// settings object — remove sttModel:
const settings: Settings = {
  notifications: localSettings.notificationsDesired && localSettings.notificationsGranted,
  soundEffects: localSettings.soundEffects,
  smartScheduling: adminAiEnabled && userAiEnabled,
};

// updateSetting — remove the sttModel branch (the `else if (key === "sttModel")` block)
```

**Step 2: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to sttModel. If other files reference `settings.sttModel`, fix those too.

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useSettings.ts
git commit -m "refactor: remove unused sttModel from useSettings hook"
```

---

### Task 2: Remove sttModel and sttLocale from Convex schema

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Remove fields from userSettings table**

Remove lines 19-20 (`sttModel` and `sttLocale`) from the `userSettings` table definition:

```typescript
userSettings: defineTable({
  userId: v.string(),
  aiEnabled: v.boolean(),
  userAiEnabled: v.optional(v.boolean()),
}).index("by_user", ["userId"]),
```

**Step 2: Push schema changes**

Run: `cd apps/convex && npx convex dev --once 2>&1 | tail -10`
Expected: Schema updated successfully. If existing documents have these fields, Convex ignores extra fields not in schema — no migration needed.

**Step 3: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "refactor: remove unused sttModel and sttLocale from Convex schema"
```

---

### Task 3: Build VoiceLanguages component

**Files:**
- Create: `apps/mobile/src/components/settings/VoiceLanguages.tsx`

**Step 1: Create the component**

This component handles:
- Fetching locales via `getSupportedLocales()`
- Displaying an expandable list with human-readable names
- Showing checkmark for installed locales
- Showing ActivityIndicator for downloading locales
- Calling `androidTriggerOfflineModelDownload()` directly (the system shows its own confirmation dialog)
- Refreshing the list on completion

```tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

function getLocaleName(code: string): string {
  try {
    const display = new Intl.DisplayNames([code], { type: "language" });
    return display.of(code) ?? code;
  } catch {
    return code;
  }
}

export function VoiceLanguages() {
  const [expanded, setExpanded] = useState(false);
  const [locales, setLocales] = useState<string[]>([]);
  const [installedLocales, setInstalledLocales] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const fetchLocales = useCallback(async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: "com.google.android.as",
      });
      setLocales(result.locales);
      setInstalledLocales(new Set(result.installedLocales));
    } catch (e) {
      console.warn("Failed to fetch locales:", e);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      fetchLocales();
    }
  }, [fetchLocales]);

  const handleLocalePress = useCallback(
    async (locale: string) => {
      if (installedLocales.has(locale) || downloading.has(locale)) return;

      setDownloading((prev) => new Set(prev).add(locale));
      try {
        // The system shows its own confirmation dialog
        const result =
          await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
            locale,
          });
        if (result.status === "download_success") {
          setInstalledLocales((prev) => new Set(prev).add(locale));
        }
      } catch (e) {
        console.warn("Download failed:", e);
      } finally {
        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(locale);
          return next;
        });
        // Refresh the list to get accurate installed state
        fetchLocales();
      }
    },
    [installedLocales, downloading, fetchLocales],
  );

  if (Platform.OS !== "android") return null;

  return (
    <View className="mb-3">
      {/* Header row */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "#cdb4db" }}
          >
            <Ionicons name="language" size={20} color="#fff" />
          </View>
          <View>
            <Text className="text-sm font-medium text-[#1e2939]">
              Voice Languages
            </Text>
            <Text className="text-xs text-[#6a7282]">
              Offline speech models
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6a7282"
        />
      </Pressable>

      {/* Expandable locale list */}
      {expanded && (
        <View className="bg-[#f5f7fa] rounded-2xl mt-1 px-2 py-2 max-h-64">
          {locales.map((locale) => {
            const installed = installedLocales.has(locale);
            const isDownloading = downloading.has(locale);

            return (
              <Pressable
                key={locale}
                onPress={() => handleLocalePress(locale)}
                className="flex-row items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ opacity: isDownloading ? 0.5 : 1 }}
              >
                <Text className="text-sm text-[#1e2939]">
                  {getLocaleName(locale)}
                </Text>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#a2d2ff" />
                ) : installed ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#86efac"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
```

**Step 2: Verify the file compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/settings/VoiceLanguages.tsx
git commit -m "feat: add VoiceLanguages component for Android locale installer"
```

---

### Task 4: Add VoiceLanguages to SettingsSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SettingsSheet.tsx`

**Step 1: Import and render VoiceLanguages**

Add import at top:
```typescript
import { VoiceLanguages } from "../settings/VoiceLanguages";
```

Add `<VoiceLanguages />` after the last `<SettingRow>` (after the Smart Scheduling row, line 77):
```tsx
          <SettingRow icon="flash-outline" color="#bde0fe" title="Smart Scheduling" subtitle="AI-powered task scoring"
            value={settings.smartScheduling} onChange={(v) => updateSetting("smartScheduling", v)}
            disabled={!adminAiEnabled} />
          <VoiceLanguages />
```

Also increase the snap point from `"50%"` to `"65%"` to accommodate the expanded list:
```typescript
snapPoints={["65%"]}
```

**Step 2: Replace `BottomSheetView` with `BottomSheetScrollView`**

The locale list can be long, so the settings sheet needs to scroll. Update import:
```typescript
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
```

Replace `<BottomSheetView>` with `<BottomSheetScrollView>` (and closing tag).

**Step 3: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/SettingsSheet.tsx
git commit -m "feat: add voice languages setting to SettingsSheet (Android only)"
```

---

### Task 5: Manual testing on Android

**Steps to verify:**
1. Open app on Android device/emulator
2. Go to Settings
3. Verify "Voice Languages" row appears (should NOT appear on iOS)
4. Tap the row — locale list expands with human-readable names
5. Installed locales show green checkmark
6. Tap an uninstalled locale — system download dialog appears + ActivityIndicator shows on that locale
7. After download completes — checkmark replaces spinner
9. Tap the row again — list collapses
10. Verify existing settings (notifications, sound, smart scheduling) still work

**Step 1: Run the app**

Run: `cd apps/mobile && npx expo start`

**Step 2: Test on Android and verify all behaviors above**

**Step 3: Final commit if any fixes needed**
