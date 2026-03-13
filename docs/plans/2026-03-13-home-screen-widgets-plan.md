# Home Screen Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three home screen widgets (Streak, Today's Task, Mood Check-in) for both iOS and Android as a premium feature.

**Architecture:** Android widgets use `react-native-android-widget` — JSX components rendered via a background task handler, reading data from AsyncStorage. iOS widgets use `@bittingz/expo-widgets` with native SwiftUI/WidgetKit code, reading from App Group UserDefaults via a custom Expo Module bridge. Data flows: HomeProvider → `syncWidgetData()` → platform storage → native widgets.

**Tech Stack:** `react-native-android-widget` (Android), `@bittingz/expo-widgets` (iOS config plugin), SwiftUI/WidgetKit (iOS native), Expo Modules API (iOS bridge), AsyncStorage (Android data), UserDefaults + App Groups (iOS data)

**Existing Work:**
- `apps/mobile/src/lib/widgetSync.ts` — stub that saves to AsyncStorage (needs expansion)
- `apps/mobile/src/components/home/HomeProvider.tsx:84-92` — already calls `syncWidgetData()` on state changes
- Task 21 from monetization plan is complete; this plan replaces Task 20 with full implementation

---

## Task 1: Install Dependencies

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install Android widget library**

Run:
```bash
cd apps/mobile && npm install react-native-android-widget
```

**Step 2: Install iOS widget config plugin**

Run:
```bash
cd apps/mobile && npx expo install @bittingz/expo-widgets
```

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat: install widget dependencies for iOS and Android"
```

---

## Task 2: Create app.config.ts with Widget Plugin Configs

**Files:**
- Create: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/app.json` (add iOS entitlements for App Group)

The project currently uses `app.json` only. We need `app.config.ts` to add the typed `react-native-android-widget` config. Expo merges both files — `app.json` is the base, `app.config.ts` extends it.

**Step 1: Add App Group entitlement to app.json**

In `app.json`, add `entitlements` under `ios`:

```jsonc
// apps/mobile/app.json → expo.ios
"entitlements": {
  "com.apple.security.application-groups": ["group.com.ottersprod.lullio.widgets"]
}
```

**Step 2: Create app.config.ts**

```typescript
// apps/mobile/app.config.ts
import type { ConfigContext, ExpoConfig } from "expo/config";
import type { WithAndroidWidgetsParams } from "react-native-android-widget";

const androidWidgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: "Streak",
      label: "Streak & XP",
      description: "Track your daily streak and XP progress",
      minWidth: "110dp",
      minHeight: "110dp",
      targetCellWidth: 2,
      targetCellHeight: 2,
      previewImage: "./assets/widget-preview/streak.png",
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000, // 30 minutes
    },
    {
      name: "TodayTask",
      label: "Today's Task",
      description: "See your suggested task for today",
      minWidth: "250dp",
      minHeight: "110dp",
      targetCellWidth: 4,
      targetCellHeight: 2,
      previewImage: "./assets/widget-preview/today-task.png",
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000,
    },
    {
      name: "Mood",
      label: "Mood Check-in",
      description: "See your current mood at a glance",
      minWidth: "110dp",
      minHeight: "110dp",
      targetCellWidth: 2,
      targetCellHeight: 2,
      previewImage: "./assets/widget-preview/mood.png",
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000,
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  plugins: [
    ...(config.plugins || []),
    ["react-native-android-widget", androidWidgetConfig],
    [
      "@bittingz/expo-widgets",
      {
        ios: {
          src: "./src/widgets/ios",
          devTeamId: "YOUR_APPLE_DEV_TEAM_ID", // TODO: Replace with actual team ID
          mode: "production",
          frequentUpdates: false,
          entitlements: {
            "com.apple.security.application-groups": [
              "group.com.ottersprod.lullio.widgets",
            ],
          },
          xcode: {
            configOverrides: {
              IPHONEOS_DEPLOYMENT_TARGET: "17.0",
            },
          },
        },
      },
    ],
  ],
});
```

**Step 3: Create placeholder widget preview directory**

Run:
```bash
mkdir -p apps/mobile/assets/widget-preview
```

Create simple placeholder images (1x1 transparent PNGs) — replace with real screenshots later:

```bash
# Create minimal placeholder PNGs (these will be replaced with actual widget screenshots)
for name in streak today-task mood; do
  convert -size 200x200 xc:'#BDE0FE' "apps/mobile/assets/widget-preview/$name.png" 2>/dev/null || \
  echo "placeholder" > "apps/mobile/assets/widget-preview/$name.png"
done
```

> Note: Real preview images should be created after widget UI is finalized. Use device screenshots of the widgets.

**Step 4: Commit**

```bash
git add apps/mobile/app.config.ts apps/mobile/app.json apps/mobile/assets/widget-preview/
git commit -m "feat: configure widget plugins for iOS and Android"
```

---

## Task 3: Create Custom Entry Point for Widget Task Handler

**Files:**
- Create: `apps/mobile/index.ts`
- Modify: `apps/mobile/package.json` (`"main"` field)

The app currently uses `expo-router/entry` as its entry point. `react-native-android-widget` requires `registerWidgetTaskHandler` to be called at app startup. We create a custom entry point that does both.

**Step 1: Create index.ts**

```typescript
// apps/mobile/index.ts
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widgets/android/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
```

**Step 2: Update package.json main field**

Change `"main"` from `"expo-router/entry"` to `"./index.ts"`.

**Step 3: Create stub task handler** (will be fully implemented in Task 7)

```typescript
// apps/mobile/src/widgets/android/widget-task-handler.ts
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  // Stub — will be implemented in Task 7
}
```

**Step 4: Commit**

```bash
git add apps/mobile/index.ts apps/mobile/package.json apps/mobile/src/widgets/android/widget-task-handler.ts
git commit -m "feat: custom entry point with widget task handler registration"
```

---

## Task 4: Create iOS Widget Bridge Expo Module

**Files:**
- Create: `apps/mobile/modules/widget-bridge/expo-module.config.json`
- Create: `apps/mobile/modules/widget-bridge/index.ts`
- Create: `apps/mobile/modules/widget-bridge/src/WidgetBridgeModule.ts`
- Create: `apps/mobile/modules/widget-bridge/ios/WidgetBridgeModule.swift`

This local Expo Module provides two functions:
1. `setWidgetData(key, value)` — writes JSON to App Group UserDefaults
2. `reloadWidgets()` — calls `WidgetCenter.shared.reloadAllTimelines()`

**Step 1: Create module config**

```json
// apps/mobile/modules/widget-bridge/expo-module.config.json
{
  "platforms": ["ios"],
  "ios": {
    "modules": ["WidgetBridgeModule"]
  }
}
```

**Step 2: Create TypeScript API**

```typescript
// apps/mobile/modules/widget-bridge/index.ts
export { setWidgetData, reloadWidgets } from "./src/WidgetBridgeModule";
```

```typescript
// apps/mobile/modules/widget-bridge/src/WidgetBridgeModule.ts
import { Platform } from "react-native";

let nativeModule: { setItem(key: string, value: string): void; reloadWidgets(): void } | null = null;

if (Platform.OS === "ios") {
  try {
    const { requireNativeModule } = require("expo-modules-core");
    nativeModule = requireNativeModule("WidgetBridge");
  } catch {
    // Module not available (e.g. Expo Go) — no-op
  }
}

export function setWidgetData(key: string, value: string): void {
  nativeModule?.setItem(key, value);
}

export function reloadWidgets(): void {
  nativeModule?.reloadWidgets();
}
```

**Step 3: Create Swift native module**

```swift
// apps/mobile/modules/widget-bridge/ios/WidgetBridgeModule.swift
import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetBridge")

        Function("setItem") { (key: String, value: String) in
            let defaults = UserDefaults(suiteName: "group.com.ottersprod.lullio.widgets")
            defaults?.set(value, forKey: key)
            defaults?.synchronize()
        }

        Function("reloadWidgets") {
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
```

**Step 4: Commit**

```bash
git add apps/mobile/modules/widget-bridge/
git commit -m "feat: iOS WidgetBridge Expo Module for App Group data sharing"
```

---

## Task 5: Update widgetSync.ts with Expanded Data & Platform Storage

**Files:**
- Modify: `apps/mobile/src/lib/widgetSync.ts`
- Create: `apps/mobile/src/lib/__tests__/widgetSync.test.ts`

**Step 1: Write test for data formatting**

```typescript
// apps/mobile/src/lib/__tests__/widgetSync.test.ts
import { formatWidgetData, type WidgetData } from "../widgetSync";

describe("formatWidgetData", () => {
  it("formats complete data correctly", () => {
    const input: WidgetData = {
      isPremium: true,
      streak: 5,
      suggestedTask: "Go for a walk",
      level: 3,
      points: 45,
      pointsToNextLevel: 100,
      moodLevel: 70,
      todayTaskCount: 4,
      todayCompletedCount: 2,
    };
    const json = formatWidgetData(input);
    const parsed = JSON.parse(json);
    expect(parsed.streak).toBe(5);
    expect(parsed.suggestedTask).toBe("Go for a walk");
    expect(parsed.isPremium).toBe(true);
    expect(parsed.moodLevel).toBe(70);
  });

  it("handles null suggestedTask", () => {
    const input: WidgetData = {
      isPremium: false,
      streak: 0,
      suggestedTask: null,
      level: 1,
      points: 0,
      pointsToNextLevel: 100,
      moodLevel: 50,
      todayTaskCount: 0,
      todayCompletedCount: 0,
    };
    const json = formatWidgetData(input);
    const parsed = JSON.parse(json);
    expect(parsed.suggestedTask).toBeNull();
    expect(parsed.isPremium).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/lib/__tests__/widgetSync.test.ts`
Expected: FAIL — `formatWidgetData` not exported

**Step 3: Implement updated widgetSync.ts**

```typescript
// apps/mobile/src/lib/widgetSync.ts
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WIDGET_KEY = "@widget_data";

export interface WidgetData {
  isPremium: boolean;
  streak: number;
  suggestedTask: string | null;
  level: number;
  points: number;
  pointsToNextLevel: number;
  moodLevel: number;
  todayTaskCount: number;
  todayCompletedCount: number;
}

export function formatWidgetData(data: WidgetData): string {
  return JSON.stringify(data);
}

export async function syncWidgetData(data: WidgetData) {
  const json = formatWidgetData(data);

  if (Platform.OS === "ios") {
    try {
      const { setWidgetData, reloadWidgets } = require("../../modules/widget-bridge");
      setWidgetData(WIDGET_KEY, json);
      reloadWidgets();
    } catch {
      // WidgetBridge not available — fall back to AsyncStorage
      await AsyncStorage.setItem(WIDGET_KEY, json);
    }
  } else {
    await AsyncStorage.setItem(WIDGET_KEY, json);
    try {
      const { requestWidgetUpdate } = require("react-native-android-widget");
      await requestWidgetUpdate({ widgetName: "Streak" });
      await requestWidgetUpdate({ widgetName: "TodayTask" });
      await requestWidgetUpdate({ widgetName: "Mood" });
    } catch {
      // Widget library not available (e.g. Expo Go)
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/lib/__tests__/widgetSync.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/lib/widgetSync.ts apps/mobile/src/lib/__tests__/widgetSync.test.ts
git commit -m "feat: expand widgetSync with premium flag, mood, and platform-specific storage"
```

---

## Task 6: Create Android Widget Components

**Files:**
- Create: `apps/mobile/src/widgets/android/StreakWidget.tsx`
- Create: `apps/mobile/src/widgets/android/TodayTaskWidget.tsx`
- Create: `apps/mobile/src/widgets/android/MoodWidget.tsx`
- Create: `apps/mobile/src/widgets/android/PremiumUpsell.tsx`

Android widgets use `FlexWidget`, `TextWidget` from `react-native-android-widget`. They are **pure components** — no hooks allowed. Data is passed as props from the task handler.

**Step 1: Create PremiumUpsell component** (shared by all widgets when not premium)

```tsx
// apps/mobile/src/widgets/android/PremiumUpsell.tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

export function PremiumUpsell() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0F9FF",
        borderRadius: 16,
        padding: 16,
        flexDirection: "column",
        flexGap: 4,
      }}
    >
      <TextWidget text="⭐" style={{ fontSize: 24 }} />
      <TextWidget
        text="Upgrade to Pro"
        style={{ fontSize: 14, fontWeight: "bold", color: "#1E3A5F" }}
      />
      <TextWidget
        text="for home widgets"
        style={{ fontSize: 11, color: "#64748B" }}
      />
    </FlexWidget>
  );
}
```

**Step 2: Create StreakWidget**

```tsx
// apps/mobile/src/widgets/android/StreakWidget.tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PremiumUpsell } from "./PremiumUpsell";

interface Props {
  isPremium: boolean;
  streak: number;
  level: number;
  points: number;
  pointsToNextLevel: number;
}

export function StreakWidget({ isPremium, streak, level, points, pointsToNextLevel }: Props) {
  if (!isPremium) return <PremiumUpsell />;

  const progressPercent = pointsToNextLevel > 0
    ? Math.round((points / pointsToNextLevel) * 100)
    : 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        flexDirection: "column",
        flexGap: 4,
      }}
    >
      <TextWidget text="🔥" style={{ fontSize: 20 }} />
      <TextWidget
        text={`${streak}`}
        style={{ fontSize: 36, fontWeight: "bold", color: "#1E3A5F" }}
      />
      <TextWidget
        text="Day Streak"
        style={{ fontSize: 11, color: "#64748B" }}
      />
      {/* XP progress bar */}
      <FlexWidget
        style={{
          width: "match_parent",
          height: 6,
          backgroundColor: "#E2E8F0",
          borderRadius: 3,
        }}
      >
        <FlexWidget
          style={{
            width: `${progressPercent}%` as any,
            height: "match_parent",
            backgroundColor: "#3B82F6",
            borderRadius: 3,
          }}
        />
      </FlexWidget>
      <TextWidget
        text={`Lvl ${level}`}
        style={{ fontSize: 10, color: "#94A3B8" }}
      />
    </FlexWidget>
  );
}
```

**Step 3: Create TodayTaskWidget**

```tsx
// apps/mobile/src/widgets/android/TodayTaskWidget.tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PremiumUpsell } from "./PremiumUpsell";

interface Props {
  isPremium: boolean;
  suggestedTask: string | null;
  todayTaskCount: number;
  todayCompletedCount: number;
}

export function TodayTaskWidget({
  isPremium,
  suggestedTask,
  todayTaskCount,
  todayCompletedCount,
}: Props) {
  if (!isPremium) return <PremiumUpsell />;

  const remaining = todayTaskCount - todayCompletedCount;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        flexDirection: "column",
        flexGap: 8,
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextWidget
          text="📋 Today"
          style={{ fontSize: 13, fontWeight: "bold", color: "#1E3A5F" }}
        />
        <TextWidget
          text={`${todayCompletedCount}/${todayTaskCount}`}
          style={{ fontSize: 12, color: "#64748B" }}
        />
      </FlexWidget>

      {/* Suggested task */}
      {suggestedTask ? (
        <FlexWidget
          style={{
            width: "match_parent",
            backgroundColor: "#F0F9FF",
            borderRadius: 8,
            padding: 10,
          }}
        >
          <TextWidget
            text={suggestedTask}
            style={{ fontSize: 14, color: "#1E3A5F" }}
            maxLines={2}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: "match_parent",
            justifyContent: "center",
            alignItems: "center",
            padding: 10,
          }}
        >
          <TextWidget
            text={remaining > 0 ? `${remaining} tasks remaining` : "All done! 🎉"}
            style={{ fontSize: 13, color: "#94A3B8" }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
```

**Step 4: Create MoodWidget**

```tsx
// apps/mobile/src/widgets/android/MoodWidget.tsx
import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PremiumUpsell } from "./PremiumUpsell";

interface Props {
  isPremium: boolean;
  moodLevel: number;
}

function getMoodEmoji(level: number): string {
  if (level >= 80) return "😊";
  if (level >= 60) return "🙂";
  if (level >= 40) return "😐";
  if (level >= 20) return "😔";
  return "😢";
}

function getMoodLabel(level: number): string {
  if (level >= 80) return "Great";
  if (level >= 60) return "Good";
  if (level >= 40) return "Okay";
  if (level >= 20) return "Low";
  return "Rough";
}

export function MoodWidget({ isPremium, moodLevel }: Props) {
  if (!isPremium) return <PremiumUpsell />;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        flexDirection: "column",
        flexGap: 6,
      }}
    >
      <TextWidget
        text={getMoodEmoji(moodLevel)}
        style={{ fontSize: 32 }}
      />
      <TextWidget
        text={getMoodLabel(moodLevel)}
        style={{ fontSize: 14, fontWeight: "bold", color: "#1E3A5F" }}
      />
      <TextWidget
        text="Tap to check in"
        style={{ fontSize: 10, color: "#94A3B8" }}
      />
    </FlexWidget>
  );
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/widgets/android/
git commit -m "feat: Android widget components (Streak, TodayTask, Mood)"
```

---

## Task 7: Create Android Widget Task Handler

**Files:**
- Modify: `apps/mobile/src/widgets/android/widget-task-handler.ts`

The task handler reads widget data from AsyncStorage and renders the appropriate widget component.

**Step 1: Implement the task handler**

```tsx
// apps/mobile/src/widgets/android/widget-task-handler.ts
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import type { WidgetData } from "../../lib/widgetSync";
import { StreakWidget } from "./StreakWidget";
import { TodayTaskWidget } from "./TodayTaskWidget";
import { MoodWidget } from "./MoodWidget";

const WIDGET_KEY = "@widget_data";

const defaultData: WidgetData = {
  isPremium: false,
  streak: 0,
  suggestedTask: null,
  level: 1,
  points: 0,
  pointsToNextLevel: 100,
  moodLevel: 50,
  todayTaskCount: 0,
  todayCompletedCount: 0,
};

async function getWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEY);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await getWidgetData();

      switch (widgetInfo.widgetName) {
        case "Streak":
          renderWidget(
            <StreakWidget
              isPremium={data.isPremium}
              streak={data.streak}
              level={data.level}
              points={data.points}
              pointsToNextLevel={data.pointsToNextLevel}
            />
          );
          break;
        case "TodayTask":
          renderWidget(
            <TodayTaskWidget
              isPremium={data.isPremium}
              suggestedTask={data.suggestedTask}
              todayTaskCount={data.todayTaskCount}
              todayCompletedCount={data.todayCompletedCount}
            />
          );
          break;
        case "Mood":
          renderWidget(
            <MoodWidget
              isPremium={data.isPremium}
              moodLevel={data.moodLevel}
            />
          );
          break;
      }
      break;
    }
    case "WIDGET_DELETED":
      break;
    case "WIDGET_CLICK":
      // All click actions are OPEN_APP — handled by the library
      break;
  }
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/widgets/android/widget-task-handler.ts
git commit -m "feat: Android widget task handler with data loading"
```

---

## Task 8: Create iOS SwiftUI Widgets

**Files:**
- Create: `apps/mobile/src/widgets/ios/WidgetData.swift`
- Create: `apps/mobile/src/widgets/ios/StreakWidget.swift`
- Create: `apps/mobile/src/widgets/ios/TodayTaskWidget.swift`
- Create: `apps/mobile/src/widgets/ios/MoodWidget.swift`
- Create: `apps/mobile/src/widgets/ios/LullioWidgets.swift`

All iOS widget code is native SwiftUI. The `@bittingz/expo-widgets` config plugin compiles these files into a WidgetKit extension. Widgets read data from App Group UserDefaults (written by the WidgetBridge Expo Module).

**Step 1: Create shared data model**

```swift
// apps/mobile/src/widgets/ios/WidgetData.swift
import Foundation

struct WidgetData: Codable {
    let isPremium: Bool
    let streak: Int
    let suggestedTask: String?
    let level: Int
    let points: Int
    let pointsToNextLevel: Int
    let moodLevel: Int
    let todayTaskCount: Int
    let todayCompletedCount: Int

    static let appGroup = "group.com.ottersprod.lullio.widgets"
    static let storageKey = "@widget_data"

    static func load() -> WidgetData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let jsonString = defaults.string(forKey: storageKey),
              let data = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    static var placeholder: WidgetData {
        WidgetData(
            isPremium: false,
            streak: 0,
            suggestedTask: nil,
            level: 1,
            points: 0,
            pointsToNextLevel: 100,
            moodLevel: 50,
            todayTaskCount: 0,
            todayCompletedCount: 0
        )
    }

    var moodEmoji: String {
        if moodLevel >= 80 { return "😊" }
        if moodLevel >= 60 { return "🙂" }
        if moodLevel >= 40 { return "😐" }
        if moodLevel >= 20 { return "😔" }
        return "😢"
    }

    var moodLabel: String {
        if moodLevel >= 80 { return "Great" }
        if moodLevel >= 60 { return "Good" }
        if moodLevel >= 40 { return "Okay" }
        if moodLevel >= 20 { return "Low" }
        return "Rough"
    }
}
```

**Step 2: Create StreakWidget**

```swift
// apps/mobile/src/widgets/ios/StreakWidget.swift
import WidgetKit
import SwiftUI

struct StreakEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(StreakEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct StreakWidgetView: View {
    let entry: StreakEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(spacing: 6) {
                Text("🔥")
                    .font(.title2)
                Text("\(entry.data.streak)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                Text("Day Streak")
                    .font(.caption)
                    .foregroundColor(.secondary)
                ProgressView(value: Double(entry.data.points),
                             total: Double(max(entry.data.pointsToNextLevel, 1)))
                    .tint(.blue)
                Text("Level \(entry.data.level)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak & XP")
        .description("Track your daily streak and XP progress")
        .supportedFamilies([.systemSmall])
    }
}
```

**Step 3: Create TodayTaskWidget**

```swift
// apps/mobile/src/widgets/ios/TodayTaskWidget.swift
import WidgetKit
import SwiftUI

struct TodayTaskEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct TodayTaskProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayTaskEntry {
        TodayTaskEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayTaskEntry) -> Void) {
        completion(TodayTaskEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayTaskEntry>) -> Void) {
        let entry = TodayTaskEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct TodayTaskWidgetView: View {
    let entry: TodayTaskEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("📋 Today")
                        .font(.caption)
                        .bold()
                    Spacer()
                    Text("\(entry.data.todayCompletedCount)/\(entry.data.todayTaskCount)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let task = entry.data.suggestedTask {
                    Text(task)
                        .font(.subheadline)
                        .lineLimit(2)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.blue.opacity(0.08))
                        .cornerRadius(8)
                } else {
                    let remaining = entry.data.todayTaskCount - entry.data.todayCompletedCount
                    Text(remaining > 0 ? "\(remaining) tasks remaining" : "All done! 🎉")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct TodayTaskWidget: Widget {
    let kind = "TodayTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayTaskProvider()) { entry in
            TodayTaskWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Task")
        .description("See your suggested task for today")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

**Step 4: Create MoodWidget**

```swift
// apps/mobile/src/widgets/ios/MoodWidget.swift
import WidgetKit
import SwiftUI

struct MoodEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct MoodProvider: TimelineProvider {
    func placeholder(in context: Context) -> MoodEntry {
        MoodEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MoodEntry) -> Void) {
        completion(MoodEntry(date: Date(), data: WidgetData.load() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoodEntry>) -> Void) {
        let entry = MoodEntry(date: Date(), data: WidgetData.load() ?? .placeholder)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct MoodWidgetView: View {
    let entry: MoodEntry

    var body: some View {
        if !entry.data.isPremium {
            PremiumUpsellView()
        } else {
            VStack(spacing: 6) {
                Text(entry.data.moodEmoji)
                    .font(.system(size: 36))
                Text(entry.data.moodLabel)
                    .font(.subheadline)
                    .bold()
                    .foregroundColor(Color(red: 0.12, green: 0.23, blue: 0.37))
                Text("Tap to check in")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct MoodWidget: Widget {
    let kind = "MoodWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MoodProvider()) { entry in
            MoodWidgetView(entry: entry)
        }
        .configurationDisplayName("Mood Check-in")
        .description("See your current mood at a glance")
        .supportedFamilies([.systemSmall])
    }
}
```

**Step 5: Create shared PremiumUpsell view and WidgetBundle**

```swift
// apps/mobile/src/widgets/ios/LullioWidgets.swift
import WidgetKit
import SwiftUI

struct PremiumUpsellView: View {
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "star.fill")
                .foregroundColor(.yellow)
                .font(.title3)
            Text("Upgrade to Pro")
                .font(.caption)
                .bold()
            Text("for home widgets")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct LullioWidgets: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        TodayTaskWidget()
        MoodWidget()
    }
}
```

**Step 6: Commit**

```bash
git add apps/mobile/src/widgets/ios/
git commit -m "feat: iOS SwiftUI widgets (Streak, TodayTask, Mood)"
```

---

## Task 9: Update HomeProvider to Sync Expanded Widget Data

**Files:**
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

The existing `syncWidgetData` call needs to include premium status, mood, and today's task counts.

**Step 1: Update the useEffect in HomeProvider**

Replace the existing widget sync effect (lines 83-92) with:

```typescript
// Sync data to shared storage for home screen widgets
useEffect(() => {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);

  syncWidgetData({
    isPremium, // from usePremium() — needs to be added to HomeProvider
    streak: streakData?.currentStreak ?? 0,
    suggestedTask: selectedTask?.title ?? null,
    level: progress.level,
    points: progress.points,
    pointsToNextLevel: progress.pointsToNextLevel,
    moodLevel,
    todayTaskCount: todayTasks.length,
    todayCompletedCount: todayTasks.filter((t) => t.completed).length,
  });
}, [isPremium, progress, selectedTask, streakData, moodLevel, tasks]);
```

**Step 2: Add isPremium to HomeProvider**

Import and use `usePremium` in HomeProvider:

```typescript
import { usePremium } from "../../hooks/usePremium";

// Inside HomeProvider function body, before the useEffect:
const { isPremium } = usePremium();
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: sync expanded widget data including premium, mood, and task counts"
```

---

## Task 10: Build, Prebuild, and Test

**Step 1: Prebuild to generate native projects**

Run:
```bash
cd apps/mobile && npx expo prebuild --clean
```

Verify no errors in the prebuild output. Check that:
- Android `android/` folder has widget provider classes generated
- iOS `ios/` folder has the widget extension target

**Step 2: Test Android widgets**

Run on Android emulator or device:
```bash
cd apps/mobile && npx expo run:android
```

Testing checklist:
- [ ] Long-press home screen → Widgets → find "Lullio" section
- [ ] Add Streak widget → verify it shows "Upgrade to Pro" (free user) or streak data (premium)
- [ ] Add Today's Task widget → verify it shows task or empty state
- [ ] Add Mood widget → verify it shows mood emoji
- [ ] Tap any widget → verify it opens the app
- [ ] Complete a task in app → verify widget updates within 30 seconds

**Step 3: Test iOS widgets** (requires macOS or EAS build)

Run:
```bash
cd apps/mobile && eas build --platform ios --profile development
```

Testing checklist:
- [ ] Long-press home screen → "+" → search "Lullio"
- [ ] Add each widget type → verify display
- [ ] Verify premium upsell shows for free users
- [ ] Tap widget → verify it opens the app

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: widget build and display adjustments"
```

---

## Priority & Execution Order

1. **Tasks 1-3** — Setup (dependencies, config, entry point)
2. **Tasks 4-5** — Data layer (iOS bridge, widgetSync)
3. **Tasks 6-7** — Android widgets (components + handler)
4. **Task 8** — iOS widgets (SwiftUI)
5. **Task 9** — Integration (HomeProvider update)
6. **Task 10** — Build & test

Tasks 6-7 (Android) and Task 8 (iOS) are independent and can be parallelized.

## Key Notes

- **Premium gating:** Widgets show "Upgrade to Pro" upsell for free users. All users can add widgets, but only premium users see real data.
- **Data freshness:** Widgets refresh every 30 minutes via `updatePeriodMillis`/timeline policy, PLUS instantly when app state changes (via `requestWidgetUpdate`/`reloadAllTimelines`).
- **No Expo Go:** Widgets require development builds. Use `npx expo run:android` or EAS builds.
- **Widget preview images:** Placeholder images are used initially. Replace with real device screenshots after widgets are finalized.
- **Apple Dev Team ID:** Replace `YOUR_APPLE_DEV_TEAM_ID` in `app.config.ts` with the actual team ID before iOS builds.
