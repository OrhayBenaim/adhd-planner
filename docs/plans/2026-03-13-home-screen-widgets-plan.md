# Home Screen Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three home screen widgets (Streak, Today's Task, Mood Check-in) for both iOS and Android as a premium feature.

**Architecture:** Fully native widgets on both platforms — no third-party widget libraries. Android uses Kotlin `AppWidgetProvider` + XML layouts + SharedPreferences. iOS uses SwiftUI/WidgetKit + App Group UserDefaults. Both platforms share data through a cross-platform WidgetBridge Expo Module. Custom Expo config plugins (`withAndroidWidgets`, `withIOSWidgets`) generate all native boilerplate during `expo prebuild`.

**Tech Stack:** Kotlin/XML (Android native widgets), SwiftUI/WidgetKit (iOS native widgets), Expo Modules API (cross-platform bridge), `@expo/config-plugins` (build-time code generation), SharedPreferences (Android data), UserDefaults + App Groups (iOS data)

**Existing Work:**
- `apps/mobile/src/lib/widgetSync.ts` — stub that saves to AsyncStorage (needs rewrite to use WidgetBridge)
- `apps/mobile/src/components/home/HomeProvider.tsx:84-92` — already calls `syncWidgetData()` on state changes
- Task 21 from monetization plan is complete; this plan replaces Task 20 with full implementation

**IMPORTANT:** Do NOT change `"main": "expo-router/entry"` in `apps/mobile/package.json`. Do NOT install third-party widget libraries.

---

## Task 1: Clean Up Previous Work

**Files:**
- Modify: `apps/mobile/package.json`
- Delete: `apps/mobile/index.ts`
- Delete: `apps/mobile/app.config.ts`
- Delete: `apps/mobile/src/widgets/android/widget-task-handler.ts`

Previous implementation attempts installed `react-native-android-widget` and `@bittingz/expo-widgets`, changed the main entry point, and created files dependent on those libraries. All of this needs to be reverted.

**Step 1: Uninstall third-party widget libraries**

```bash
cd apps/mobile && npm uninstall react-native-android-widget @bittingz/expo-widgets
```

**Step 2: Revert package.json main field** (if it was changed)

Ensure `"main"` is `"expo-router/entry"` in `apps/mobile/package.json`.

**Step 3: Delete files from previous approach**

```bash
rm -f apps/mobile/index.ts
rm -f apps/mobile/app.config.ts
rm -f apps/mobile/src/widgets/android/widget-task-handler.ts
```

**Step 4: Keep what's still valid**

Keep these files/changes from previous work:
- `apps/mobile/app.json` — App Group entitlement addition is correct
- `apps/mobile/assets/widget-preview/` — placeholder images are fine

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove third-party widget libraries, revert to clean state"
```

---

## Task 2: Create WidgetBridge Expo Module (Both Platforms)

**Files:**
- Create: `apps/mobile/modules/widget-bridge/expo-module.config.json`
- Create: `apps/mobile/modules/widget-bridge/index.ts`
- Create: `apps/mobile/modules/widget-bridge/src/WidgetBridgeModule.ts`
- Create: `apps/mobile/modules/widget-bridge/ios/WidgetBridgeModule.swift`
- Create: `apps/mobile/modules/widget-bridge/android/src/main/java/expo/modules/widgetbridge/WidgetBridgeModule.kt`
- Create: `apps/mobile/modules/widget-bridge/android/build.gradle`
- Create: `apps/mobile/modules/widget-bridge/android/src/main/AndroidManifest.xml`

This local Expo Module provides cross-platform widget data sharing:
- `setWidgetData(key, value)` — writes JSON to platform-specific shared storage
- `reloadWidgets()` — triggers widget refresh on both platforms

**Step 1: Create module config**

```json
// apps/mobile/modules/widget-bridge/expo-module.config.json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["WidgetBridgeModule"]
  },
  "android": {
    "modules": ["expo.modules.widgetbridge.WidgetBridgeModule"]
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

let nativeModule: {
  setItem(key: string, value: string): void;
  reloadWidgets(): void;
} | null = null;

try {
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("WidgetBridge");
} catch {
  // Module not available (e.g. Expo Go) — no-op
}

export function setWidgetData(key: string, value: string): void {
  nativeModule?.setItem(key, value);
}

export function reloadWidgets(): void {
  nativeModule?.reloadWidgets();
}
```

**Step 3: Create Swift native module (iOS)**

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

**Step 4: Create Kotlin native module (Android)**

```gradle
// apps/mobile/modules/widget-bridge/android/build.gradle
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
apply plugin: 'maven-publish'

group = 'expo.modules.widgetbridge'
version = '0.1.0'

android {
    namespace "expo.modules.widgetbridge"
    compileSdkVersion safeExtGet("compileSdkVersion", 35)

    defaultConfig {
        minSdkVersion safeExtGet("minSdkVersion", 24)
        targetSdkVersion safeExtGet("targetSdkVersion", 35)
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation project(':expo-modules-core')
}

def safeExtGet(prop, fallback) {
    rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}
```

```xml
<!-- apps/mobile/modules/widget-bridge/android/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android" />
```

```kotlin
// apps/mobile/modules/widget-bridge/android/src/main/java/expo/modules/widgetbridge/WidgetBridgeModule.kt
package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetBridgeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("WidgetBridge")

        Function("setItem") { key: String, value: String ->
            val context = appContext.reactContext ?: return@Function
            val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
        }

        Function("reloadWidgets") {
            val context = appContext.reactContext ?: return@Function
            val appWidgetManager = AppWidgetManager.getInstance(context)

            val widgetProviders = listOf(
                "com.ottersprod.lullio.widget.StreakWidgetProvider",
                "com.ottersprod.lullio.widget.TodayTaskWidgetProvider",
                "com.ottersprod.lullio.widget.MoodWidgetProvider"
            )

            for (providerName in widgetProviders) {
                try {
                    val provider = ComponentName(context, providerName)
                    val widgetIds = appWidgetManager.getAppWidgetIds(provider)
                    if (widgetIds.isNotEmpty()) {
                        appWidgetManager.notifyAppWidgetViewDataChanged(widgetIds, android.R.id.text1)
                        // Send update broadcast
                        val intent = android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                        intent.component = provider
                        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                        context.sendBroadcast(intent)
                    }
                } catch (e: Exception) {
                    // Widget provider not found — skip
                }
            }
        }
    }
}
```

**Step 5: Commit**

```bash
git add apps/mobile/modules/widget-bridge/
git commit -m "feat: cross-platform WidgetBridge Expo Module for widget data sharing"
```

---

## Task 3: Update widgetSync.ts with WidgetBridge Integration

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

  try {
    const { setWidgetData, reloadWidgets } = require("../../modules/widget-bridge");
    setWidgetData(WIDGET_KEY, json);
    reloadWidgets();
  } catch {
    // WidgetBridge not available (e.g. Expo Go) — no-op
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/lib/__tests__/widgetSync.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/lib/widgetSync.ts apps/mobile/src/lib/__tests__/widgetSync.test.ts
git commit -m "feat: widgetSync using WidgetBridge for cross-platform widget data"
```

---

## Task 4: Create Android Native Widget Source Files

**Files:**
- Create: `apps/mobile/src/widgets/android/res/drawable/widget_background.xml`
- Create: `apps/mobile/src/widgets/android/res/drawable/widget_background_premium_upsell.xml`
- Create: `apps/mobile/src/widgets/android/res/drawable/widget_progress_bar.xml`
- Create: `apps/mobile/src/widgets/android/res/layout/widget_streak.xml`
- Create: `apps/mobile/src/widgets/android/res/layout/widget_today_task.xml`
- Create: `apps/mobile/src/widgets/android/res/layout/widget_mood.xml`
- Create: `apps/mobile/src/widgets/android/res/layout/widget_premium_upsell.xml`
- Create: `apps/mobile/src/widgets/android/res/xml/streak_widget_info.xml`
- Create: `apps/mobile/src/widgets/android/res/xml/today_task_widget_info.xml`
- Create: `apps/mobile/src/widgets/android/res/xml/mood_widget_info.xml`
- Create: `apps/mobile/src/widgets/android/kotlin/WidgetDataHelper.kt`
- Create: `apps/mobile/src/widgets/android/kotlin/StreakWidgetProvider.kt`
- Create: `apps/mobile/src/widgets/android/kotlin/TodayTaskWidgetProvider.kt`
- Create: `apps/mobile/src/widgets/android/kotlin/MoodWidgetProvider.kt`

These source files live in `src/widgets/android/` and are copied to the correct native locations by the config plugin during prebuild.

**Step 1: Create drawable resources**

```xml
<!-- apps/mobile/src/widgets/android/res/drawable/widget_background.xml -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <corners android:radius="16dp" />
</shape>
```

```xml
<!-- apps/mobile/src/widgets/android/res/drawable/widget_background_premium_upsell.xml -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#F0F9FF" />
    <corners android:radius="16dp" />
</shape>
```

```xml
<!-- apps/mobile/src/widgets/android/res/drawable/widget_progress_bar.xml -->
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@android:id/background">
        <shape android:shape="rectangle">
            <solid android:color="#E2E8F0" />
            <corners android:radius="3dp" />
        </shape>
    </item>
    <item android:id="@android:id/progress">
        <clip>
            <shape android:shape="rectangle">
                <solid android:color="#3B82F6" />
                <corners android:radius="3dp" />
            </shape>
        </clip>
    </item>
</layer-list>
```

**Step 2: Create premium upsell layout** (shared by all widgets when not premium)

```xml
<!-- apps/mobile/src/widgets/android/res/layout/widget_premium_upsell.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:orientation="vertical"
    android:background="@drawable/widget_background_premium_upsell"
    android:padding="16dp"
    android:id="@+id/widget_root">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="⭐"
        android:textSize="24sp" />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Upgrade to Pro"
        android:textSize="14sp"
        android:textStyle="bold"
        android:textColor="#1E3A5F"
        android:layout_marginTop="4dp" />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="for home widgets"
        android:textSize="11sp"
        android:textColor="#64748B"
        android:layout_marginTop="2dp" />
</LinearLayout>
```

**Step 3: Create Streak widget layout**

```xml
<!-- apps/mobile/src/widgets/android/res/layout/widget_streak.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:id="@+id/widget_root">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="🔥"
        android:textSize="20sp" />
    <TextView
        android:id="@+id/streak_count"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="0"
        android:textSize="36sp"
        android:textStyle="bold"
        android:textColor="#1E3A5F"
        android:layout_marginTop="4dp" />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Day Streak"
        android:textSize="11sp"
        android:textColor="#64748B"
        android:layout_marginTop="2dp" />
    <ProgressBar
        android:id="@+id/xp_progress"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="6dp"
        android:progressDrawable="@drawable/widget_progress_bar"
        android:max="100"
        android:progress="0"
        android:layout_marginTop="6dp" />
    <TextView
        android:id="@+id/level_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Lvl 1"
        android:textSize="10sp"
        android:textColor="#94A3B8"
        android:layout_marginTop="2dp" />
</LinearLayout>
```

**Step 4: Create TodayTask widget layout**

```xml
<!-- apps/mobile/src/widgets/android/res/layout/widget_today_task.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="16dp"
    android:id="@+id/widget_root">
    <!-- Header row -->
    <RelativeLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="📋 Today"
            android:textSize="13sp"
            android:textStyle="bold"
            android:textColor="#1E3A5F"
            android:layout_alignParentStart="true" />
        <TextView
            android:id="@+id/task_progress"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="0/0"
            android:textSize="12sp"
            android:textColor="#64748B"
            android:layout_alignParentEnd="true" />
    </RelativeLayout>
    <!-- Task card -->
    <TextView
        android:id="@+id/suggested_task"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text=""
        android:textSize="14sp"
        android:textColor="#1E3A5F"
        android:maxLines="2"
        android:ellipsize="end"
        android:background="@drawable/widget_background_premium_upsell"
        android:padding="10dp"
        android:layout_marginTop="8dp" />
</LinearLayout>
```

**Step 5: Create Mood widget layout**

```xml
<!-- apps/mobile/src/widgets/android/res/layout/widget_mood.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:id="@+id/widget_root">
    <TextView
        android:id="@+id/mood_emoji"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="😐"
        android:textSize="32sp" />
    <TextView
        android:id="@+id/mood_label"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Okay"
        android:textSize="14sp"
        android:textStyle="bold"
        android:textColor="#1E3A5F"
        android:layout_marginTop="6dp" />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tap to check in"
        android:textSize="10sp"
        android:textColor="#94A3B8"
        android:layout_marginTop="4dp" />
</LinearLayout>
```

**Step 6: Create widget info XML files**

```xml
<!-- apps/mobile/src/widgets/android/res/xml/streak_widget_info.xml -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_streak"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_streak_description" />
```

```xml
<!-- apps/mobile/src/widgets/android/res/xml/today_task_widget_info.xml -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_today_task"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_today_task_description" />
```

```xml
<!-- apps/mobile/src/widgets/android/res/xml/mood_widget_info.xml -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_mood"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_mood_description" />
```

**Step 7: Create shared WidgetDataHelper**

```kotlin
// apps/mobile/src/widgets/android/kotlin/WidgetDataHelper.kt
package com.ottersprod.lullio.widget

import android.content.Context
import org.json.JSONObject

data class WidgetData(
    val isPremium: Boolean,
    val streak: Int,
    val suggestedTask: String?,
    val level: Int,
    val points: Int,
    val pointsToNextLevel: Int,
    val moodLevel: Int,
    val todayTaskCount: Int,
    val todayCompletedCount: Int
) {
    companion object {
        private const val PREFS_NAME = "widget_data"
        private const val KEY = "@widget_data"

        fun load(context: Context): WidgetData {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY, null) ?: return default()
            return try {
                val obj = JSONObject(json)
                WidgetData(
                    isPremium = obj.optBoolean("isPremium", false),
                    streak = obj.optInt("streak", 0),
                    suggestedTask = if (obj.isNull("suggestedTask")) null else obj.optString("suggestedTask"),
                    level = obj.optInt("level", 1),
                    points = obj.optInt("points", 0),
                    pointsToNextLevel = obj.optInt("pointsToNextLevel", 100),
                    moodLevel = obj.optInt("moodLevel", 50),
                    todayTaskCount = obj.optInt("todayTaskCount", 0),
                    todayCompletedCount = obj.optInt("todayCompletedCount", 0)
                )
            } catch (e: Exception) {
                default()
            }
        }

        fun default() = WidgetData(
            isPremium = false,
            streak = 0,
            suggestedTask = null,
            level = 1,
            points = 0,
            pointsToNextLevel = 100,
            moodLevel = 50,
            todayTaskCount = 0,
            todayCompletedCount = 0
        )
    }

    val moodEmoji: String get() = when {
        moodLevel >= 80 -> "😊"
        moodLevel >= 60 -> "🙂"
        moodLevel >= 40 -> "😐"
        moodLevel >= 20 -> "😔"
        else -> "😢"
    }

    val moodLabel: String get() = when {
        moodLevel >= 80 -> "Great"
        moodLevel >= 60 -> "Good"
        moodLevel >= 40 -> "Okay"
        moodLevel >= 20 -> "Low"
        else -> "Rough"
    }
}
```

**Step 8: Create StreakWidgetProvider**

```kotlin
// apps/mobile/src/widgets/android/kotlin/StreakWidgetProvider.kt
package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class StreakWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_streak).apply {
                    setTextViewText(R.id.streak_count, "${data.streak}")
                    setTextViewText(R.id.level_text, "Lvl ${data.level}")
                    val progress = if (data.pointsToNextLevel > 0) {
                        (data.points * 100) / data.pointsToNextLevel
                    } else 0
                    setProgressBar(R.id.xp_progress, 100, progress, false)
                }
            }

            // Click to open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

**Step 9: Create TodayTaskWidgetProvider**

```kotlin
// apps/mobile/src/widgets/android/kotlin/TodayTaskWidgetProvider.kt
package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews

class TodayTaskWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_today_task).apply {
                    setTextViewText(R.id.task_progress, "${data.todayCompletedCount}/${data.todayTaskCount}")
                    val remaining = data.todayTaskCount - data.todayCompletedCount
                    val taskText = data.suggestedTask
                        ?: if (remaining > 0) "$remaining tasks remaining" else "All done! 🎉"
                    setTextViewText(R.id.suggested_task, taskText)
                }
            }

            // Click to open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

**Step 10: Create MoodWidgetProvider**

```kotlin
// apps/mobile/src/widgets/android/kotlin/MoodWidgetProvider.kt
package com.ottersprod.lullio.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class MoodWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val data = WidgetData.load(context)
            val packageName = context.packageName

            val views = if (!data.isPremium) {
                RemoteViews(packageName, R.layout.widget_premium_upsell)
            } else {
                RemoteViews(packageName, R.layout.widget_mood).apply {
                    setTextViewText(R.id.mood_emoji, data.moodEmoji)
                    setTextViewText(R.id.mood_label, data.moodLabel)
                }
            }

            // Click to open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

**Step 11: Commit**

```bash
git add apps/mobile/src/widgets/android/
git commit -m "feat: native Android widget source files (Kotlin providers + XML layouts)"
```

---

## Task 5: Create Android Expo Config Plugin

**Files:**
- Create: `apps/mobile/plugins/withAndroidWidgets.ts`

This config plugin runs during `expo prebuild` and:
1. Copies Kotlin widget providers to `android/app/src/main/java/com/ottersprod/lullio/widget/`
2. Copies XML resource files (layouts, drawables, widget info) to `android/app/src/main/res/`
3. Adds string resources for widget descriptions
4. Adds `<receiver>` entries to AndroidManifest.xml for each widget

**Step 1: Create the config plugin**

```typescript
// apps/mobile/plugins/withAndroidWidgets.ts
import {
  ConfigPlugin,
  withDangerousMod,
  withAndroidManifest,
  withStringsXml,
} from "expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

const WIDGET_SRC_DIR = "src/widgets/android";
const PACKAGE_PATH = "com/ottersprod/lullio/widget";

const WIDGETS = [
  {
    name: "Streak",
    providerClass: "StreakWidgetProvider",
    label: "Streak & XP",
  },
  {
    name: "TodayTask",
    providerClass: "TodayTaskWidgetProvider",
    label: "Today's Task",
  },
  {
    name: "Mood",
    providerClass: "MoodWidgetProvider",
    label: "Mood Check-in",
  },
];

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const withAndroidWidgetFiles: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, "android", "app", "src", "main");

      // Copy Kotlin files
      const kotlinSrc = path.join(projectRoot, WIDGET_SRC_DIR, "kotlin");
      const kotlinDest = path.join(androidRoot, "java", PACKAGE_PATH);
      if (fs.existsSync(kotlinSrc)) {
        copyDirSync(kotlinSrc, kotlinDest);
      }

      // Copy res directories (layout, xml, drawable)
      const resSrc = path.join(projectRoot, WIDGET_SRC_DIR, "res");
      const resDest = path.join(androidRoot, "res");
      if (fs.existsSync(resSrc)) {
        for (const subDir of fs.readdirSync(resSrc)) {
          copyDirSync(
            path.join(resSrc, subDir),
            path.join(resDest, subDir)
          );
        }
      }

      return config;
    },
  ]);
};

const withAndroidWidgetManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application?.[0];
    if (!mainApp) return config;

    if (!mainApp.receiver) {
      mainApp.receiver = [];
    }

    const widgetConfigs = [
      { provider: "StreakWidgetProvider", infoXml: "streak_widget_info" },
      { provider: "TodayTaskWidgetProvider", infoXml: "today_task_widget_info" },
      { provider: "MoodWidgetProvider", infoXml: "mood_widget_info" },
    ];

    for (const widget of widgetConfigs) {
      const fullClassName = `com.ottersprod.lullio.widget.${widget.provider}`;

      // Skip if already added
      if (mainApp.receiver.some((r: any) => r.$?.["android:name"] === fullClassName)) {
        continue;
      }

      mainApp.receiver.push({
        $: {
          "android:name": fullClassName,
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": `@xml/${widget.infoXml}`,
            },
          },
        ],
      } as any);
    }

    return config;
  });
};

const withAndroidWidgetStrings: ConfigPlugin = (config) => {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    const widgetStrings = [
      { name: "widget_streak_description", value: "Track your daily streak and XP progress" },
      { name: "widget_today_task_description", value: "See your suggested task for today" },
      { name: "widget_mood_description", value: "See your current mood at a glance" },
    ];

    for (const ws of widgetStrings) {
      if (!strings.some((s: any) => s.$.name === ws.name)) {
        strings.push({ $: { name: ws.name }, _: ws.value } as any);
      }
    }

    config.modResults.resources.string = strings;
    return config;
  });
};

export const withAndroidWidgets: ConfigPlugin = (config) => {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetStrings(config);
  return config;
};
```

**Step 2: Commit**

```bash
git add apps/mobile/plugins/withAndroidWidgets.ts
git commit -m "feat: Expo config plugin for Android widget prebuild integration"
```

---

## Task 6: Create iOS SwiftUI Widget Source Files

**Files:**
- Create: `apps/mobile/src/widgets/ios/WidgetData.swift`
- Create: `apps/mobile/src/widgets/ios/StreakWidget.swift`
- Create: `apps/mobile/src/widgets/ios/TodayTaskWidget.swift`
- Create: `apps/mobile/src/widgets/ios/MoodWidget.swift`
- Create: `apps/mobile/src/widgets/ios/LullioWidgets.swift`

These SwiftUI source files are compiled into a WidgetKit extension by the iOS config plugin. They read data from App Group UserDefaults (written by the WidgetBridge Expo Module).

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
git commit -m "feat: iOS SwiftUI widget source files (Streak, TodayTask, Mood)"
```

---

## Task 7: Create iOS Expo Config Plugin

**Files:**
- Create: `apps/mobile/plugins/withIOSWidgets.ts`

This config plugin runs during `expo prebuild` and adds a WidgetKit extension target to the Xcode project. It:
1. Creates a new PBXNativeTarget for the widget extension
2. Copies SwiftUI source files to the extension directory
3. Sets up build configurations (Debug + Release)
4. Adds build phases (sources, frameworks)
5. Embeds the extension in the main app
6. Creates the entitlements file with App Group
7. Generates Info.plist for the extension

This is the most complex task. Use `withXcodeProject` from `@expo/config-plugins` which provides access to the parsed `.pbxproj` via the `xcode` npm module (bundled with Expo).

**Step 1: Create the config plugin**

The plugin must do the following (implement as a single `withDangerousMod` + `withXcodeProject`):

```typescript
// apps/mobile/plugins/withIOSWidgets.ts
import {
  ConfigPlugin,
  withXcodeProject,
  withDangerousMod,
  withEntitlementsPlist,
} from "expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

const WIDGET_EXTENSION_NAME = "LullioWidgets";
const WIDGET_BUNDLE_ID = "com.ottersprod.lullio.widgets";
const APP_GROUP = "group.com.ottersprod.lullio.widgets";
const SWIFT_SRC_DIR = "src/widgets/ios";
const DEPLOYMENT_TARGET = "17.0";

// Ensure main app also has App Group entitlement
const withAppGroupEntitlement: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return config;
  });
};

// Copy Swift files and create extension support files
const withWidgetExtensionFiles: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      const extensionDir = path.join(iosRoot, WIDGET_EXTENSION_NAME);

      fs.mkdirSync(extensionDir, { recursive: true });

      // Copy Swift source files
      const swiftSrcDir = path.join(projectRoot, SWIFT_SRC_DIR);
      if (fs.existsSync(swiftSrcDir)) {
        for (const file of fs.readdirSync(swiftSrcDir)) {
          if (file.endsWith(".swift")) {
            fs.copyFileSync(
              path.join(swiftSrcDir, file),
              path.join(extensionDir, file)
            );
          }
        }
      }

      // Create entitlements file
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(extensionDir, `${WIDGET_EXTENSION_NAME}.entitlements`),
        entitlements
      );

      // Create Info.plist
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionDir, "Info.plist"), infoPlist);

      return config;
    },
  ]);
};

// Add widget extension target to Xcode project
const withWidgetXcodeTarget: ConfigPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetName = WIDGET_EXTENSION_NAME;

    // Check if target already exists
    const existingTarget = project.pbxTargetByName(targetName);
    if (existingTarget) return config;

    // Add the widget extension target
    const target = project.addTarget(
      targetName,
      "app_extension",
      targetName,
      `${WIDGET_BUNDLE_ID}`
    );

    // Add Swift source files to the target
    const groupName = targetName;
    const group = project.addPbxGroup([], groupName, targetName);
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, mainGroupId);

    // Find the Swift files in the extension directory
    const iosRoot = path.join(config.modRequest.projectRoot, "ios");
    const extensionDir = path.join(iosRoot, targetName);
    if (fs.existsSync(extensionDir)) {
      const swiftFiles = fs.readdirSync(extensionDir).filter((f) => f.endsWith(".swift"));
      for (const file of swiftFiles) {
        project.addSourceFile(
          `${targetName}/${file}`,
          { target: target.uuid },
          group.uuid
        );
      }

      // Add Info.plist to the group (not as source)
      if (fs.existsSync(path.join(extensionDir, "Info.plist"))) {
        project.addFile(`${targetName}/Info.plist`, group.uuid);
      }

      // Add entitlements to the group (not as source)
      if (fs.existsSync(path.join(extensionDir, `${targetName}.entitlements`))) {
        project.addFile(`${targetName}/${targetName}.entitlements`, group.uuid);
      }
    }

    // Add WidgetKit and SwiftUI frameworks
    project.addFramework("WidgetKit.framework", {
      target: target.uuid,
      link: true,
    });
    project.addFramework("SwiftUI.framework", {
      target: target.uuid,
      link: true,
    });

    // Set build settings for the widget target
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config_entry = configurations[key];
      if (
        typeof config_entry === "object" &&
        config_entry.buildSettings &&
        config_entry.baseConfigurationReference !== undefined
      ) {
        // Check if this config belongs to our target
        const targetConfigs = project.pbxXCConfigurationList()?.[target.pbxNativeTarget?.buildConfigurationList];
        if (targetConfigs?.buildConfigurations?.some((bc: any) => bc.value === key)) {
          config_entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${WIDGET_BUNDLE_ID}"`;
          config_entry.buildSettings.INFOPLIST_FILE = `"${targetName}/Info.plist"`;
          config_entry.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/${targetName}.entitlements"`;
          config_entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
          config_entry.buildSettings.SWIFT_VERSION = "5.0";
          config_entry.buildSettings.TARGETED_DEVICE_FAMILY = `"1,2"`;
          config_entry.buildSettings.SKIP_INSTALL = "YES";
          config_entry.buildSettings.GENERATE_INFOPLIST_FILE = "YES";
          config_entry.buildSettings.CURRENT_PROJECT_VERSION = "1";
          config_entry.buildSettings.MARKETING_VERSION = "1.0";
          config_entry.buildSettings.CODE_SIGN_STYLE = "Automatic";
        }
      }
    }

    // Add embed extension build phase to main app target
    const mainTarget = project.getFirstTarget();
    if (mainTarget) {
      project.addBuildPhase(
        [],
        "PBXCopyFilesBuildPhase",
        "Embed Foundation Extensions",
        mainTarget.uuid,
        "app_extension"
      );
    }

    return config;
  });
};

export const withIOSWidgets: ConfigPlugin = (config) => {
  config = withAppGroupEntitlement(config);
  config = withWidgetExtensionFiles(config);
  config = withWidgetXcodeTarget(config);
  return config;
};
```

> **Note:** The Xcode project manipulation is complex. The code above covers the core structure. During prebuild testing (Task 10), you may need to adjust build settings or target configuration details. The `xcode` module API used by `withXcodeProject` can be inspected at `node_modules/xcode/lib/pbxProject.js`.

**Step 2: Commit**

```bash
git add apps/mobile/plugins/withIOSWidgets.ts
git commit -m "feat: Expo config plugin for iOS WidgetKit extension prebuild integration"
```

---

## Task 8: Create app.config.ts with Custom Plugin Configs

**Files:**
- Create: `apps/mobile/app.config.ts`

**Step 1: Create app.config.ts**

```typescript
// apps/mobile/app.config.ts
import type { ConfigContext, ExpoConfig } from "expo/config";
import { withAndroidWidgets } from "./plugins/withAndroidWidgets";
import { withIOSWidgets } from "./plugins/withIOSWidgets";

export default ({ config }: ConfigContext): ExpoConfig => {
  let modifiedConfig: ExpoConfig = {
    ...config,
    name: config.name!,
    slug: config.slug!,
  };

  modifiedConfig = withAndroidWidgets(modifiedConfig);
  modifiedConfig = withIOSWidgets(modifiedConfig);

  return modifiedConfig;
};
```

**Step 2: Commit**

```bash
git add apps/mobile/app.config.ts
git commit -m "feat: app.config.ts with custom Android and iOS widget plugins"
```

---

## Task 9: Update HomeProvider to Sync Expanded Widget Data

**Files:**
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

The existing `syncWidgetData` call needs to include premium status, mood, and today's task counts.

**Step 1: Add isPremium to HomeProvider**

Import and use `usePremium` in HomeProvider:

```typescript
import { usePremium } from "../../hooks/usePremium";

// Inside HomeProvider function body, before the useEffect:
const { isPremium } = usePremium();
```

**Step 2: Update the useEffect in HomeProvider**

Replace the existing widget sync effect (around lines 83-92) with:

```typescript
// Sync data to shared storage for home screen widgets
useEffect(() => {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);

  syncWidgetData({
    isPremium,
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

**Step 3: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: sync expanded widget data including premium, mood, and task counts"
```

---

## Task 10: Typecheck, Build, and Test

**Step 1: Run typecheck**

```bash
cd apps/mobile && npm run typecheck
```

Fix any type errors. The config plugins use Node.js fs/path APIs which need `@types/node`.

**Step 2: Run tests**

```bash
cd apps/mobile && npx jest src/lib/__tests__/widgetSync.test.ts
```

**Step 3: Prebuild to generate native projects**

```bash
cd apps/mobile && npx expo prebuild --clean
```

Verify no errors in the prebuild output. Check that:
- Android: `android/app/src/main/java/com/ottersprod/lullio/widget/` has Kotlin providers
- Android: `android/app/src/main/res/layout/` has widget layout XMLs
- Android: `android/app/src/main/res/xml/` has widget info XMLs
- Android: `AndroidManifest.xml` has `<receiver>` entries
- iOS: `ios/LullioWidgets/` has Swift widget files
- iOS: Xcode project has LullioWidgets extension target

**Step 4: Test Android widgets**

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
- [ ] Complete a task in app → verify widget updates

**Step 5: Test iOS widgets** (requires macOS or EAS build)

```bash
cd apps/mobile && eas build --platform ios --profile development
```

Testing checklist:
- [ ] Long-press home screen → "+" → search "Lullio"
- [ ] Add each widget type → verify display
- [ ] Verify premium upsell shows for free users
- [ ] Tap widget → verify it opens the app

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: widget build and display adjustments"
```

---

## Priority & Execution Order

1. **Task 1** — Clean up previous work
2. **Tasks 2-3** — Data layer (WidgetBridge module, widgetSync)
3. **Tasks 4-5** — Android widgets (native source files + config plugin)
4. **Tasks 6-7** — iOS widgets (SwiftUI files + config plugin)
5. **Task 8** — Wire up config (app.config.ts)
6. **Task 9** — Integration (HomeProvider update)
7. **Task 10** — Typecheck, build & test

Tasks 4-5 (Android) and Tasks 6-7 (iOS) are independent and can be parallelized.

## Key Notes

- **No third-party widget libraries.** All widget code is native (Kotlin/XML for Android, SwiftUI for iOS). Custom Expo config plugins handle build integration.
- **Do NOT change `"main": "expo-router/entry"`** in package.json.
- **Premium gating:** Widgets show "Upgrade to Pro" upsell for free users. All users can add widgets, but only premium users see real data.
- **Data freshness:** Widgets refresh every 30 minutes via `updatePeriodMillis`/timeline policy, PLUS instantly when app state changes (via WidgetBridge `reloadWidgets()`).
- **No Expo Go:** Widgets require development builds. Use `npx expo run:android` or EAS builds.
- **Widget preview images:** Placeholder images are used initially. Replace with real device screenshots after widgets are finalized.
- **Config plugin complexity:** The iOS config plugin (`withIOSWidgets`) manipulates the Xcode `.pbxproj` file directly. This is inherently fragile and may need adjustments based on Expo SDK version. Test with `expo prebuild --clean` after any changes.
