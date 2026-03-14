# Widget Tap → Paywall Deep Link — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a non-premium user taps the widget's Pro upsell, open the paywall (or sign-in-gate first if anonymous) instead of the home screen.

**Architecture:** Use the `lullio://paywall` deep link from native widgets. The app-side handler in `_layout.tsx` detects this URL via Expo Router's `useURL()` and calls the existing `showPaywall()` which routes anonymous → sign-in-gate → paywall, or authenticated → paywall directly.

**Tech Stack:** Kotlin (Android widgets), SwiftUI (iOS widgets), React Native / Expo Router (app-side)

---

### Task 1: App-Side Deep Link Handler

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/hooks/usePremium.tsx` (expose ref-based trigger)

**Step 1: Add a `paywallTrigger` ref to PremiumProvider**

In `apps/mobile/src/hooks/usePremium.tsx`, export a module-level event so that `_layout.tsx` can trigger `showPaywall()` from outside the context:

```typescript
// Add at top of file, after imports:
import * as Linking from "expo-linking";

// Inside PremiumProvider, add this useEffect after the showPaywall definition (after line 135):
useEffect(() => {
  function handleUrl(event: { url: string }) {
    const parsed = Linking.parse(event.url);
    if (parsed.path === "paywall") {
      showPaywall();
    }
  }

  // Handle URL when app is already open
  const subscription = Linking.addEventListener("url", handleUrl);

  // Handle URL that launched the app (cold start)
  Linking.getInitialURL().then((url) => {
    if (url) handleUrl({ url });
  });

  return () => subscription.remove();
}, [showPaywall]);
```

**Step 2: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/usePremium.tsx
git commit -m "feat: handle lullio://paywall deep link in PremiumProvider"
```

---

### Task 2: Android — Deep Link Intent for Premium Upsell

**Files:**
- Modify: `apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/TodayTaskWidgetProvider.kt`
- Modify: `apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/StreakWidgetProvider.kt`
- Modify: `apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/MoodWidgetProvider.kt`

**Step 1: Update TodayTaskWidgetProvider.kt**

Add `import android.net.Uri` to imports (after line 8).

Replace lines 71-79 (the root click handler) with:

```kotlin
            // Click on root: non-premium opens paywall deep link, premium opens app
            val rootIntent = if (!data.isPremium) {
                Intent(Intent.ACTION_VIEW, Uri.parse("lullio://paywall")).apply {
                    setPackage(packageName)
                }
            } else {
                context.packageManager.getLaunchIntentForPackage(packageName)
            }
            if (rootIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, rootIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
```

**Step 2: Update StreakWidgetProvider.kt**

Add `import android.content.Intent` and `import android.net.Uri` to imports.

Replace lines 35-43 (the root click handler) with the same pattern:

```kotlin
            // Click on root: non-premium opens paywall deep link, premium opens app
            val rootIntent = if (!data.isPremium) {
                Intent(Intent.ACTION_VIEW, Uri.parse("lullio://paywall")).apply {
                    setPackage(packageName)
                }
            } else {
                context.packageManager.getLaunchIntentForPackage(packageName)
            }
            if (rootIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, rootIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
```

**Step 3: Update MoodWidgetProvider.kt**

Add `import android.net.Uri` to imports.

Replace lines 55-63 (the root click handler) with the same pattern:

```kotlin
            // Click on root: non-premium opens paywall deep link, premium opens app
            val rootIntent = if (!data.isPremium) {
                Intent(Intent.ACTION_VIEW, Uri.parse("lullio://paywall")).apply {
                    setPackage(packageName)
                }
            } else {
                context.packageManager.getLaunchIntentForPackage(packageName)
            }
            if (rootIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, rootIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
```

**Step 4: Commit**

```bash
git add apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/TodayTaskWidgetProvider.kt \
       apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/StreakWidgetProvider.kt \
       apps/mobile/android/app/src/main/java/com/ottersprod/lullio/widget/MoodWidgetProvider.kt
git commit -m "feat: android widgets open paywall deep link for non-premium users"
```

---

### Task 3: iOS — widgetURL for Premium Upsell

**Files:**
- Modify: `apps/mobile/src/widgets/ios/LullioWidgets.swift` (PremiumUpsellView)

**Step 1: Add widgetURL to PremiumUpsellView**

The `PremiumUpsellView` is used by all three iOS widgets. Adding `widgetURL` here covers all of them.

In `apps/mobile/src/widgets/ios/LullioWidgets.swift`, update the `PremiumUpsellView` body (lines 6-18):

```swift
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
        .widgetURL(URL(string: "lullio://paywall"))
        .containerBackground(.fill.tertiary, for: .widget)
    }
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/widgets/ios/LullioWidgets.swift
git commit -m "feat: iOS premium upsell widget opens paywall via deep link"
```

---

### Task 4: Copy Update — "premium" → "Pro"

**Files:**
- Modify: `apps/mobile/app/sign-in-gate.tsx`

**Step 1: Update sign-in-gate subtitle**

In `apps/mobile/app/sign-in-gate.tsx`, change line 41 from:

```tsx
            Create an account or sign in to access premium features and make purchases
```

to:

```tsx
            Create an account or sign in to access Pro features and make purchases
```

Also update the SignUpWithEmail subtitle on line 57 from:

```tsx
              subtitle="Sign up to unlock premium features"
```

to:

```tsx
              subtitle="Sign up to unlock Pro features"
```

**Step 2: Commit**

```bash
git add apps/mobile/app/sign-in-gate.tsx
git commit -m "fix: rename 'premium' to 'Pro' in sign-in-gate copy"
```

---

### Task 5: Verify & Typecheck

**Step 1: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS, no errors

**Step 2: Run react-doctor**

Run: `cd apps/mobile && npx -y react-doctor@latest .`
Expected: PASS (ignore icon warnings)

**Step 3: Final commit if any fixes needed**

---

## Testing Checklist

- [ ] Android: Add widget as non-premium → tap upsell → app opens to paywall (or sign-in-gate if anonymous)
- [ ] Android: Add widget as premium → tap widget → app opens to home screen
- [ ] iOS: Add widget as non-premium → tap upsell → app opens to paywall (or sign-in-gate if anonymous)
- [ ] iOS: Add widget as premium → tap widget → app opens to home screen
- [ ] Anonymous user: widget tap → sign-in-gate → link account → paywall appears
- [ ] Authenticated non-Pro: widget tap → paywall appears directly
- [ ] Cold start: kill app → tap non-premium widget → app launches → paywall/sign-in-gate
- [ ] Warm start: app in background → tap non-premium widget → navigates to paywall/sign-in-gate
