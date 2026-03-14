# Profile Unsubscribe Button — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a subscription row to the profile screen showing expiry date and a cancel button for premium users.

**Architecture:** Extend `usePremium` hook to expose `expiresAt`, `willRenew`, and `managementURL` from RevenueCat's `CustomerInfo`. Add a subscription row component to `AuthenticatedProfile` that displays this info and opens platform subscription settings on cancel.

**Tech Stack:** React Native, RevenueCat SDK (`react-native-purchases`), NativeWind, Expo Router

---

### Task 1: Extend usePremium hook with subscription details

**Files:**
- Modify: `apps/mobile/src/hooks/usePremium.tsx`

**Step 1: Add new fields to PremiumState interface**

Change `PremiumState` to include subscription details:

```typescript
interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
}
```

**Step 2: Update PremiumAction types**

Add the new fields to `INIT_DONE` and `PREMIUM_CHANGED` actions:

```typescript
type PremiumAction =
  | { type: "INIT_DONE"; isPremium: boolean; expiresAt: string | null; willRenew: boolean; managementURL: string | null }
  | { type: "INIT_FAILED" }
  | { type: "PREMIUM_CHANGED"; isPremium: boolean; expiresAt: string | null; willRenew: boolean; managementURL: string | null };
```

**Step 3: Update premiumReducer**

```typescript
function premiumReducer(_state: PremiumState, action: PremiumAction): PremiumState {
  switch (action.type) {
    case "INIT_DONE":
      return {
        isPremium: action.isPremium,
        isLoading: false,
        expiresAt: action.expiresAt,
        willRenew: action.willRenew,
        managementURL: action.managementURL,
      };
    case "INIT_FAILED":
      return { isPremium: false, isLoading: false, expiresAt: null, willRenew: false, managementURL: null };
    case "PREMIUM_CHANGED":
      return {
        ..._state,
        isPremium: action.isPremium,
        expiresAt: action.expiresAt,
        willRenew: action.willRenew,
        managementURL: action.managementURL,
      };
  }
}
```

**Step 4: Update PremiumContextValue interface**

```typescript
interface PremiumContextValue {
  isPremium: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
  showPaywall: () => void;
}
```

**Step 5: Update initial useReducer state**

```typescript
const [{ isPremium, isLoading, expiresAt, willRenew, managementURL }, dispatch] = useReducer(premiumReducer, {
  isPremium: false,
  isLoading: true,
  expiresAt: null,
  willRenew: false,
  managementURL: null,
});
```

**Step 6: Create helper to extract entitlement info from CustomerInfo**

Add this helper function inside `PremiumProvider` (before the `useEffect` calls):

```typescript
const extractSubscriptionInfo = useCallback((info: CustomerInfo) => {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  return {
    isPremium: !!entitlement,
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    managementURL: info.managementURL ?? null,
  };
}, []);
```

Import `CustomerInfo` type:
```typescript
import Purchases, { type CustomerInfo } from "react-native-purchases";
```

Note: `CustomerInfo` is already imported on line 10 — no change needed for this import.

**Step 7: Update init() dispatch to use helper**

Replace the dispatch in `init()`:

```typescript
const info = await Purchases.getCustomerInfo();
dispatch({ type: "INIT_DONE", ...extractSubscriptionInfo(info) });
```

**Step 8: Update listener dispatch to use helper**

Replace the listener dispatch:

```typescript
const listener = (info: CustomerInfo) => {
  dispatch({ type: "PREMIUM_CHANGED", ...extractSubscriptionInfo(info) });
};
```

**Step 9: Update context value**

Update the `PremiumContext` value to include new fields:

```typescript
<PremiumContext value={{ isPremium, isAnonymous, isLoading, expiresAt, willRenew, managementURL, showPaywall }}>
```

**Step 10: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS with no errors related to usePremium

**Step 11: Commit**

```bash
git add apps/mobile/src/hooks/usePremium.tsx
git commit -m "feat: expose subscription details from usePremium hook"
```

---

### Task 2: Add subscription row to AuthenticatedProfile

**Files:**
- Modify: `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx`

**Step 1: Update imports**

Add `Linking`, `Platform`, and `Alert` to the react-native import:

```typescript
import { View, Text, Image, Alert, Linking, Platform } from "react-native";
```

**Step 2: Destructure new fields from usePremium**

```typescript
const { isPremium, expiresAt, willRenew, managementURL } = usePremium();
```

**Step 3: Add date formatting helper**

Add this inside the component, before the return:

```typescript
const formatExpiryDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
```

**Step 4: Add cancel subscription handler**

Add this callback after `handleDeleteAccount`:

```typescript
const handleCancelSubscription = useCallback(() => {
  Alert.alert(
    "Cancel Subscription",
    "You'll be redirected to your device's subscription settings to manage your subscription.",
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Continue",
        style: "destructive",
        onPress: () => {
          const url =
            managementURL ??
            (Platform.OS === "ios"
              ? "https://apps.apple.com/account/subscriptions"
              : "https://play.google.com/store/account/subscriptions");
          Linking.openURL(url);
        },
      },
    ],
  );
}, [managementURL]);
```

**Step 5: Add subscription row JSX**

Insert this block between the Achievements `Pressable` and the Sign Out `Pressable` (after the `{/* Achievements (premium only) */}` block, before `{/* Sign Out */}`):

```tsx
{/* Subscription (premium only) */}
{isPremium && (
  <View className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center mb-3" style={{ gap: 12 }}>
    <View className="w-10 h-10 rounded-full bg-[#ffafcc] items-center justify-center">
      <Ionicons name="card-outline" size={20} color="#fff" />
    </View>
    <View className="flex-1">
      <Text className="text-sm font-medium text-[#1e2939]">Subscription</Text>
      {expiresAt && (
        <Text className="text-xs text-[#6a7282]">
          {willRenew ? "Renews" : "Expires"} {formatExpiryDate(expiresAt)}
        </Text>
      )}
    </View>
    {willRenew && (
      <Pressable onPress={handleCancelSubscription}>
        <Text className="text-sm font-medium text-[#ff6b6b]">Cancel</Text>
      </Pressable>
    )}
  </View>
)}
```

**Step 6: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS with no errors

**Step 7: Run react-doctor**

Run: `cd apps/mobile && npx -y react-doctor@latest .`
Expected: PASS (ignore icon-related warnings)

**Step 8: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx
git commit -m "feat: add subscription row with cancel button to profile"
```
