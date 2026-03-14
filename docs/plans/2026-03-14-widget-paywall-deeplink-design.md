# Widget Tap → Paywall Deep Link

**Date:** 2026-03-14
**Status:** Approved

## Problem

When a non-premium user taps the widget's Pro upsell, the app opens to the home screen instead of the paywall. Anonymous users also need to link/create an account before reaching the paywall.

## Solution

Use deep links (`lullio://paywall`) from widget taps to trigger the existing `showPaywall()` flow, which already handles:
- Anonymous → sign-in-gate → (after auth) → paywall
- Authenticated (non-Pro) → paywall directly

## Changes

### 1. Android Widgets — Deep Link Intent

In all three widget providers (`TodayTaskWidgetProvider.kt`, `StreakWidgetProvider.kt`, `MoodWidgetProvider.kt`), change the `widget_root` tap `PendingIntent` for the non-premium upsell layout from `getLaunchIntentForPackage()` to:

```kotlin
val intent = Intent(Intent.ACTION_VIEW, Uri.parse("lullio://paywall"))
```

### 2. iOS Widgets — widgetURL

In the SwiftUI premium upsell views (`TodayTaskWidget.swift`, `StreakWidget.swift`, `MoodWidget.swift`), add:

```swift
.widgetURL(URL(string: "lullio://paywall"))
```

### 3. App-Side — Handle Deep Link

In `apps/mobile/app/_layout.tsx`, use Expo Linking's `useURL()` to detect `lullio://paywall` and call `showPaywall()`:

```typescript
const url = useURL();
useEffect(() => {
  if (url && url.includes("paywall")) {
    showPaywall();
  }
}, [url]);
```

This requires lifting the `showPaywall` call or using a ref/event pattern since `useURL()` is in `_layout.tsx` but `showPaywall` comes from `PremiumContext`.

### 4. Copy Update

In `sign-in-gate.tsx`, change "premium features" → "Pro features" in the subtitle.

## Files to Modify

- `apps/mobile/android/.../widget/TodayTaskWidgetProvider.kt`
- `apps/mobile/android/.../widget/StreakWidgetProvider.kt`
- `apps/mobile/android/.../widget/MoodWidgetProvider.kt`
- `apps/mobile/src/widgets/ios/TodayTaskWidget.swift`
- `apps/mobile/src/widgets/ios/StreakWidget.swift`
- `apps/mobile/src/widgets/ios/MoodWidget.swift`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/sign-in-gate.tsx`
