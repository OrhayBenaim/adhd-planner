# Achievements Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move achievements from a bottom sheet to a full-screen Expo Router page, accessible via a button in ProfileSheet (premium + signed-in only), with a completion percentage at the top.

**Architecture:** Create `app/achievements.tsx` as a new stack screen. Extract achievement card rendering from the existing sheet into the new page. Add an achievements button to `AuthenticatedProfile`. Remove all sheet-related achievements code (ref, registration, import, type union entry). Remove the achievements navigation from StreakBadge press.

**Tech Stack:** React Native, Expo Router, NativeWind, Convex queries, expo-linear-gradient

---

### Task 1: Create the achievements page route

**Files:**
- Create: `apps/mobile/app/achievements.tsx`

**Step 1: Create the achievements page**

```tsx
import { View, Text, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppPressable as Pressable } from "../src/components/AppPressable";

export default function AchievementsPage() {
  const router = useRouter();
  const definitions = useQuery(api.achievementDefs.listDefinitions);
  const unlocked = useQuery(api.achievementDefs.listUnlocked);

  const unlockedIds = new Set(unlocked?.map((a) => a.achievementId) ?? []);
  const unlockedMap = new Map(
    unlocked?.map((a) => [a.achievementId, a]) ?? [],
  );

  const totalCount = definitions?.length ?? 0;
  const unlockedCount = unlockedIds.size;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Achievements",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
            </Pressable>
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f5f7fa" },
          headerTitleStyle: { color: "#0A0A0A", fontWeight: "600" },
        }}
      />
      <ScrollView
        className="flex-1 bg-[#f5f7fa]"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-6">
          {/* Completion summary */}
          <Text className="text-base font-medium text-[#6A7282] mb-6">
            {unlockedCount}/{totalCount} Achievements ({percentage}%)
          </Text>

          {/* Grid */}
          <View className="flex-row flex-wrap gap-3">
            {definitions?.map((def) => {
              const isUnlocked = unlockedIds.has(def.id);
              const achievement = unlockedMap.get(def.id);

              return (
                <View
                  key={def.id}
                  className="w-[48%] rounded-3xl overflow-hidden"
                  style={{ opacity: isUnlocked ? 1 : 0.5 }}
                >
                  {isUnlocked ? (
                    <LinearGradient
                      colors={["#a2d2ff", "#cdb4db"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 16, borderRadius: 24 }}
                    >
                      <AchievementContent
                        def={def}
                        isUnlocked
                        unlockedAt={achievement?.unlockedAt}
                      />
                    </LinearGradient>
                  ) : (
                    <View className="bg-[#e5e7eb] p-4 rounded-3xl">
                      <AchievementContent def={def} isUnlocked={false} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function AchievementContent({
  def,
  isUnlocked,
  unlockedAt,
}: {
  def: { icon: string; name: string; description: string };
  isUnlocked: boolean;
  unlockedAt?: number;
}) {
  const iconColor = isUnlocked ? "#fff" : "#9ca3af";
  const textColor = isUnlocked ? "text-white" : "text-[#6a7282]";
  const nameColor = isUnlocked ? "text-white" : "text-[#9ca3af]";

  return (
    <View className="items-center gap-2">
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{
          backgroundColor: isUnlocked
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.05)",
        }}
      >
        <Ionicons
          name={def.icon as any}
          size={24}
          color={iconColor}
        />
      </View>
      <Text className={`text-sm font-semibold ${nameColor} text-center`}>
        {def.name}
      </Text>
      <Text className={`text-[10px] ${textColor} text-center`}>
        {def.description}
      </Text>
      {isUnlocked && unlockedAt && (
        <Text className="text-[9px] text-white/60 text-center">
          {new Date(unlockedAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}
```

**Step 2: Verify the route works**

Run: `npx expo start` and navigate to `/achievements` in the app.
Expected: Full-screen page with header, completion text, and achievement grid.

**Step 3: Commit**

```bash
git add apps/mobile/app/achievements.tsx
git commit -m "feat: add achievements full-screen page route"
```

---

### Task 2: Add achievements button to AuthenticatedProfile

**Files:**
- Modify: `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx`

**Step 1: Add router import and achievements button**

Add import at top of file:
```tsx
import { useRouter } from "expo-router";
import { usePremium } from "../../../hooks/usePremium";
```

Add inside the component, before `const [busy, setBusy] = useState(false);`:
```tsx
  const router = useRouter();
  const { isPremium } = usePremium();
```

Add the achievements button JSX between the profile info section (`</View>` after line 129) and the Sign Out button (line 132). Insert this block:

```tsx
      {/* Achievements (premium only) */}
      {isPremium && (
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
      )}
```

Note: The `setTimeout` with 300ms delay allows the profile sheet close animation to complete before navigating.

**Step 2: Verify**

Open profile sheet while signed in + premium → see Achievements button → tap → sheet closes, achievements page opens.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx
git commit -m "feat: add achievements button to authenticated profile"
```

---

### Task 3: Remove achievements bottom sheet

**Files:**
- Delete: `apps/mobile/src/components/sheets/AchievementsSheet.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Remove from SheetManager.tsx**

Remove the import line (line 12):
```tsx
// DELETE: import { AchievementsSheet } from "../sheets/AchievementsSheet";
```

Remove the ref declaration (line 27):
```tsx
// DELETE: const achievementsSheetRef = useRef<BottomSheet>(null);
```

Remove the registerSheet call (line 39):
```tsx
// DELETE: registerSheet({ name: "achievements", ref: achievementsSheetRef });
```

Remove the JSX (line 53):
```tsx
// DELETE: <AchievementsSheet ref={achievementsSheetRef} onClose={onSheetClose} />
```

**Step 2: Remove from HomeProvider.tsx**

Remove `"achievements"` from the `ActiveSheet` type union (line 26):
```tsx
// Before:
  | "achievements"
// After: (delete this line entirely)
```

**Step 3: Remove achievements navigation from MainContent.tsx**

Change the StreakBadge onPress (around line 153-156). Remove the `onPress` prop entirely — StreakBadge becomes display-only:

```tsx
// Before:
          <StreakBadge
            streak={streakData.currentStreak}
            onPress={() => openSheet("achievements")}
          />

// After:
          <StreakBadge
            streak={streakData.currentStreak}
          />
```

Note: Check `StreakBadge` component — if `onPress` is optional, this just works. If it's required, make it optional.

**Step 4: Delete AchievementsSheet.tsx**

```bash
rm apps/mobile/src/components/sheets/AchievementsSheet.tsx
```

**Step 5: Run typecheck**

```bash
cd apps/mobile && npm run typecheck
```

Expected: No errors. Fix any issues with StreakBadge's `onPress` prop type if needed.

**Step 6: Run react-doctor**

```bash
cd apps/mobile && npx -y react-doctor@latest .
```

Fix any warnings (ignore icon-related ones).

**Step 7: Commit**

```bash
git add -u
git commit -m "refactor: remove achievements bottom sheet, clean up references"
```

---

### Task 4: Final verification

**Step 1: Full typecheck from root**

```bash
npm run typecheck
```

Expected: All apps pass.

**Step 2: Manual test flow**

1. Open app → sign in → ensure premium
2. Tap profile icon → see Achievements button with trophy icon
3. Tap Achievements → profile closes, achievements page opens
4. See "X/8 Achievements (Y%)" at top
5. See 2-column grid with unlocked (gradient) and locked (gray) cards
6. Tap back → return to home screen
7. Verify StreakBadge no longer navigates anywhere on tap

**Step 3: Commit final state if any fixes needed**

```bash
git add -u
git commit -m "fix: address typecheck/react-doctor issues"
```
