# Profile Upgrade A/B Test — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an upgrade CTA to the Profile sheet for non-premium users, A/B tested via PostHog with two variants (feature card vs locked teasers), tracking full conversion funnel.

**Architecture:** PostHog feature flag `profile-upgrade-variant` controls which variant renders. Two new components (one per variant) slot into AuthenticatedProfile. Events tracked at each funnel step. PostHog insight created via MCP tool.

**Tech Stack:** PostHog (posthog-react-native, useFeatureFlag hook), expo-linear-gradient, NativeWind, Ionicons

**Design doc:** `docs/plans/2026-03-17-profile-upgrade-ab-test-design.md`

---

### Task 1: Create Variant A — UpgradeFeatureCard

**Files:**
- Create: `apps/mobile/src/components/sheets/profile/UpgradeFeatureCard.tsx`

**Step 1: Create the component**

```tsx
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "../../AppPressable";

const FEATURES = [
  { icon: "sparkles-outline" as const, label: "AI Coach", desc: "Smart notifications to keep you on track" },
  { icon: "grid-outline" as const, label: "Home Widgets", desc: "Quick access from your home screen" },
  { icon: "trophy-outline" as const, label: "Achievements", desc: "Earn badges for your progress" },
  { icon: "bar-chart-outline" as const, label: "Insights", desc: "See your 7-day completion trends" },
];

interface UpgradeFeatureCardProps {
  onUpgrade: () => void;
}

export function UpgradeFeatureCard({ onUpgrade }: UpgradeFeatureCardProps) {
  return (
    <View className="bg-[#cdb4db]/20 rounded-3xl px-4 py-5 mb-3">
      <Text className="text-base font-semibold text-[#0A0A0A] mb-3 text-center">
        Unlock Lullio Pro
      </Text>

      <View style={{ gap: 10 }} className="mb-4">
        {FEATURES.map((f) => (
          <View key={f.label} className="flex-row items-center" style={{ gap: 10 }}>
            <View className="w-8 h-8 rounded-full bg-[#cdb4db]/30 items-center justify-center">
              <Ionicons name={f.icon} size={16} color="#9b59b6" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#0A0A0A]">{f.label}</Text>
              <Text className="text-xs text-[#6A7282]">{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={onUpgrade}>
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 20, paddingVertical: 12, alignItems: "center" }}
        >
          <Text className="text-sm font-semibold text-white">Try Lullio Pro</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/UpgradeFeatureCard.tsx
git commit -m "feat: add UpgradeFeatureCard component (variant A)"
```

---

### Task 2: Create Variant C — UpgradeLockedTeasers

**Files:**
- Create: `apps/mobile/src/components/sheets/profile/UpgradeLockedTeasers.tsx`

**Step 1: Create the component**

```tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "../../AppPressable";

const FEATURES = [
  { key: "ai_coach", icon: "sparkles-outline" as const, label: "AI Coach", desc: "Smart notifications to keep you on track" },
  { key: "home_widgets", icon: "grid-outline" as const, label: "Home Widgets", desc: "Quick access from your home screen" },
  { key: "achievements", icon: "trophy-outline" as const, label: "Achievements", desc: "Earn badges for your progress" },
  { key: "insights", icon: "bar-chart-outline" as const, label: "Insights", desc: "See your 7-day completion trends" },
];

interface UpgradeLockedTeasersProps {
  onUpgrade: (source: string) => void;
}

export function UpgradeLockedTeasers({ onUpgrade }: UpgradeLockedTeasersProps) {
  return (
    <View style={{ gap: 8 }}>
      {FEATURES.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onUpgrade(`teaser_${f.key}`)}
          className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center"
          style={{ gap: 12, opacity: 0.7 }}
        >
          <View className="w-10 h-10 rounded-full bg-[#cdb4db] items-center justify-center">
            <Ionicons name={f.icon} size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-[#0A0A0A]">{f.label}</Text>
            <Text className="text-xs text-[#6A7282]">{f.desc}</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
        </Pressable>
      ))}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/UpgradeLockedTeasers.tsx
git commit -m "feat: add UpgradeLockedTeasers component (variant C)"
```

---

### Task 3: Integrate A/B test into AuthenticatedProfile

**Files:**
- Modify: `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx`

**Step 1: Add imports and hook**

Add these imports at the top:

```tsx
import { useFeatureFlag } from "posthog-react-native";
import { useEffect } from "react"; // add useEffect to existing import
import { posthog } from "../../../lib/posthog";
import { UpgradeFeatureCard } from "./UpgradeFeatureCard";
import { UpgradeLockedTeasers } from "./UpgradeLockedTeasers";
```

**Step 2: Add feature flag and tracking inside the component**

Inside `AuthenticatedProfile`, after the existing hooks:

```tsx
const upgradeVariant = useFeatureFlag("profile-upgrade-variant");

// Fire upgrade_cta_viewed when non-premium user sees the profile
useEffect(() => {
  if (!isPremium && upgradeVariant) {
    posthog.capture("upgrade_cta_viewed", { variant: upgradeVariant });
  }
}, [isPremium, upgradeVariant]);

const handleUpgrade = useCallback(
  (source: string = "feature_card") => {
    posthog.capture("paywall_opened", { variant: upgradeVariant, source });
    showPaywall();
  },
  [upgradeVariant, showPaywall],
);
```

Note: `showPaywall` is already available from `usePremium()` — add it to the destructuring on line 33:
```tsx
const { isPremium, expiresAt, willRenew, managementURL, showPaywall } = usePremium();
```

**Step 3: Replace the premium-only sections**

Replace the Achievements and Subscription blocks (lines 166-205) with:

```tsx
{/* Premium: show achievements + subscription management */}
{isPremium && (
  <>
    <Pressable
      onPress={() => {
        onClose();
        setTimeout(() => router.push("/achievements"), 300);
      }}
      className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center mb-3"
      style={{ gap: 12 }}
    >
      <View className="w-10 h-10 rounded-full bg-[#cdb4db] items-center justify-center">
        <Ionicons name="trophy-outline" size={20} color="#fff" />
      </View>
      <Text className="text-sm font-medium text-[#1e2939]">Achievements</Text>
      <View className="flex-1" />
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </Pressable>

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
      <Pressable onPress={handleCancelSubscription}>
        <Text className="text-sm font-medium text-[#ff6b6b]">
          {willRenew ? "Cancel" : "Manage"}
        </Text>
      </Pressable>
    </View>
  </>
)}

{/* Non-premium: show upgrade variant */}
{!isPremium && upgradeVariant === "feature-card" && (
  <UpgradeFeatureCard onUpgrade={() => handleUpgrade("feature_card")} />
)}
{!isPremium && upgradeVariant === "locked-teasers" && (
  <UpgradeLockedTeasers onUpgrade={handleUpgrade} />
)}
```

**Step 4: Run typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No errors

**Step 5: Run react-doctor**

```bash
cd apps/mobile && npx -y react-doctor@latest .
```

Expected: No new warnings (ignore icon-related)

**Step 6: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx
git commit -m "feat: integrate upgrade A/B test into profile sheet"
```

---

### Task 4: Track subscription_purchased with variant

**Files:**
- Modify: `apps/mobile/src/hooks/usePremium.tsx`

**Step 1: Add PostHog import**

```tsx
import { posthog } from "../lib/posthog";
```

**Step 2: Fire event on premium status change**

In the `PREMIUM_CHANGED` listener (the `useEffect` at line 166), after dispatching the action, add purchase tracking:

```tsx
const listener = (info: CustomerInfo) => {
  const subInfo = extractSubscriptionInfo(info);
  dispatch({ type: "PREMIUM_CHANGED", ...subInfo });

  // Track new subscription purchase
  if (subInfo.isPremium && !isPremium) {
    posthog.capture("subscription_purchased", {
      variant: posthog.getFeatureFlag("profile-upgrade-variant") ?? "unknown",
    });
  }
};
```

Note: We use `posthog.getFeatureFlag()` (singleton method) instead of a hook since this runs inside an effect callback. The `!isPremium` check ensures we only fire on the transition from free → premium.

**Step 3: Run typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/usePremium.tsx
git commit -m "feat: track subscription_purchased event with A/B variant"
```

---

### Task 5: Create PostHog feature flag and funnel insight

**Step 1: Create the feature flag**

Use PostHog MCP tool `create-feature-flag`:
- Key: `profile-upgrade-variant`
- Type: multivariate
- Variants: `feature-card` (50%), `locked-teasers` (50%)
- Filter: all users (premium filtering handled client-side)

**Step 2: Create funnel insight**

Use PostHog MCP tool `insight-create-from-query`:
- Name: "Profile Upgrade Funnel"
- Type: Funnel
- Steps:
  1. `upgrade_cta_viewed`
  2. `paywall_opened`
  3. `subscription_purchased`
- Breakdown: `variant` property

**Step 3: Verify in PostHog dashboard**

Confirm flag and insight appear correctly.

---

### Task 6: Manual QA

**Step 1: Test variant A (feature card)**

- Override PostHog flag to `feature-card` in dev
- Open profile sheet as non-premium user
- Verify card renders with 4 features and gradient CTA button
- Tap "Try Lullio Pro" → verify navigation to sign-in-gate (anonymous) or paywall (authenticated)
- Check PostHog for `upgrade_cta_viewed` and `paywall_opened` events

**Step 2: Test variant C (locked teasers)**

- Override PostHog flag to `locked-teasers`
- Open profile sheet as non-premium user
- Verify 4 locked feature rows render with lock icons and reduced opacity
- Tap any row → verify navigation + correct `source` in event

**Step 3: Test premium user**

- As premium user, verify Achievements + Subscription cards show as before
- No upgrade CTA visible

**Step 4: Test no flag (fallback)**

- Disable feature flag → verify no upgrade CTA shows (graceful fallback)
