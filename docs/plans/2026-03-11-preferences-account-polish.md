# Preferences & Account Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the preferences sheet more compact, move name editing to the profile sheet, fix icons, and fix the account merge bug that redirects users to onboarding.

**Architecture:** Four independent UI/backend changes to existing components. No new files needed.

**Tech Stack:** React Native, @gorhom/bottom-sheet, Ionicons, Convex mutations

---

### Task 1: Compact PreferencesSheet — Remove Name Tab & Reduce Height

**Files:**
- Modify: `apps/mobile/src/components/sheets/PreferencesSheet.tsx`

**Step 1: Update SEGMENTS array — remove the Name entry**

Change lines 13-18 from:
```tsx
const SEGMENTS = [
  { label: "Name", color: "#ffc8dd" },
  { label: "Times", color: "#cdb4db" },
  { label: "Difficulties", color: "#ffafcc" },
  { label: "Strengths", color: "#a2d2ff" },
];
```
To:
```tsx
const SEGMENTS = [
  { label: "Times", color: "#cdb4db" },
  { label: "Difficulties", color: "#ffafcc" },
  { label: "Strengths", color: "#a2d2ff" },
];
```

**Step 2: Reduce snap point from 85% to 50%**

Change line 111 from `snapPoints={["85%"]}` to `snapPoints={["50%"]}`.

**Step 3: Remove name state and auto-save logic**

In the component body:
- Remove `const [name, setName] = useState("");` (line 31)
- Remove `name` from `savedRef.current` initialization (line 37) — change to `{ bestWorkTimes: [] as string[], difficulties: [] as string[], strengths: [] as string[] }`
- Remove `setName(preferences.name)` from the useEffect (line 42)
- Remove `name: preferences.name` from savedRef.current assignment (line 46)
- Remove the `name` comparison in `autoSave` (line 60): `if (name !== saved.name) patch.name = name;`
- Remove `name` from savedRef.current update in autoSave (line 70) — change to `{ bestWorkTimes, difficulties, strengths }`
- Remove `name` from `autoSave` useCallback dependency array (line 72)

**Step 4: Remove the Name tab JSX (activeTab === 0 block)**

Delete the entire block at lines 132-148:
```tsx
{activeTab === 0 && (
  <View className="items-center pt-8">
    ...name input...
  </View>
)}
```

**Step 5: Re-index the remaining tab conditions**

Change:
- `activeTab === 1` → `activeTab === 0` (Times)
- `activeTab === 2` → `activeTab === 1` (Difficulties)
- `activeTab === 3` → `activeTab === 2` (Strengths)

**Step 6: Remove unused imports**

Remove `TextInput` from the react-native import (no longer used in this file).
Remove `Ionicons` import if no longer used (check — the close icon still uses it, so keep it).
Remove `LinearGradient` import if only used in the name tab... no, it's used in the Times tab too. Keep it.

**Step 7: Verify**

Run: `npx expo start` on emulator, open Preferences sheet.
Expected: Sheet is ~50% height, shows 3 tabs (Times/Difficulties/Strengths), scrolls within the sheet. No Name tab.

**Step 8: Commit**

```bash
git add apps/mobile/src/components/sheets/PreferencesSheet.tsx
git commit -m "feat: compact preferences sheet — remove name tab, reduce to 50% height"
```

---

### Task 2: Add Editable Name to ProfileSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/ProfileSheet.tsx`

**Step 1: Import useUpdatePreferences hook and add name state**

Add import:
```tsx
import { useUpdatePreferences } from "../../hooks/usePreferences";
```

Inside the component, add after the existing state declarations:
```tsx
const updatePreferences = useUpdatePreferences();
const [editName, setEditName] = useState("");
const [nameLoaded, setNameLoaded] = useState(false);
```

**Step 2: Sync name from preferences**

Add a useEffect (import `useEffect` from react):
```tsx
useEffect(() => {
  if (preferences?.name && !nameLoaded) {
    setEditName(preferences.name);
    setNameLoaded(true);
  }
}, [preferences, nameLoaded]);
```

**Step 3: Add auto-save for name on close**

In the `resetState` callback, add name save logic. Or better — add a `saveName` function and call it on sheet close:

```tsx
const saveName = useCallback(() => {
  const trimmed = editName.trim();
  if (trimmed && trimmed !== (preferences?.name ?? "")) {
    updatePreferences({ name: trimmed });
  }
}, [editName, preferences, updatePreferences]);
```

Update the BottomSheet `onClose` handler (line 598-601) to also call `saveName()`:
```tsx
onClose={() => {
  saveName();
  resetState();
  onClose();
}}
```

**Step 4: Add name input to anonymous user main view**

In the anonymous user main view (inside `renderContent`, after the avatar View at line 458-467), replace the static name display with an editable input:

Replace:
```tsx
<Text className="text-xl font-semibold text-[#1e2939]">
  {userName}
</Text>
```

With:
```tsx
<BottomSheetTextInput
  value={editName}
  onChangeText={setEditName}
  placeholder="Your name"
  placeholderTextColor="#9ca3af"
  className="text-xl font-semibold text-[#1e2939] text-center"
  style={{ minWidth: 120, paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}
/>
```

**Step 5: Add name input to authenticated user main view**

In the authenticated user view (line 537-539), replace the static name with an editable input:

Replace:
```tsx
<Text className="text-xl font-semibold text-[#1e2939]">
  {session?.user?.name ?? "User"}
</Text>
```

With:
```tsx
<BottomSheetTextInput
  value={editName}
  onChangeText={setEditName}
  placeholder="Your name"
  placeholderTextColor="#9ca3af"
  className="text-xl font-semibold text-[#1e2939] text-center"
  style={{ minWidth: 120, paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}
/>
```

**Step 6: Verify**

Run emulator, open Profile sheet.
Expected: Name is editable with an underline input. Changes auto-save when sheet closes.

**Step 7: Commit**

```bash
git add apps/mobile/src/components/sheets/ProfileSheet.tsx
git commit -m "feat: add editable name field to profile sheet"
```

---

### Task 3: Fix BottomNav Icons

**Files:**
- Modify: `apps/mobile/src/components/BottomNav.tsx`

**Step 1: Change preferences icon**

Line 71: Change `name="person-outline"` to `name="color-palette-outline"`.

**Step 2: Change profile icon**

Line 83: Change `name="person-circle-outline"` to `name="person-outline"`.

**Step 3: Verify**

Run emulator, check BottomNav.
Expected: Preferences shows palette icon, Profile shows person icon (no circle).

**Step 4: Commit**

```bash
git add apps/mobile/src/components/BottomNav.tsx
git commit -m "fix: use distinct icons for preferences and profile in bottom nav"
```

---

### Task 4: Fix Account Merge — Preserve onboardingCompleted Flag

**Files:**
- Modify: `apps/convex/convex/migration.ts`

**Step 1: Understand the bug**

In `migration.ts` lines 37-48, when migrating preferences:
- If the new user already has a `userPreferences` record, the old record (with `onboardingCompleted: true`) is simply deleted
- The new user's record does NOT get `onboardingCompleted: true`
- So `needsOnboarding` query sees no `onboardingCompleted` flag → redirects to onboarding

**Step 2: Fix the preferences migration block**

Replace lines 37-48:
```ts
if (oldPrefs) {
  console.log(`[migration] found preferences for old user, migrating`);
  const existing = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", newUserId))
    .first();
  if (existing) {
    await ctx.db.delete(oldPrefs._id);
  } else {
    await ctx.db.patch(oldPrefs._id, { userId: newUserId });
  }
}
```

With:
```ts
if (oldPrefs) {
  console.log(`[migration] found preferences for old user, migrating`);
  const existing = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", newUserId))
    .first();
  if (existing) {
    // Merge critical flags from old prefs into existing new user prefs
    const patch: Record<string, unknown> = {};
    if (oldPrefs.onboardingCompleted && !existing.onboardingCompleted) {
      patch.onboardingCompleted = true;
    }
    // Merge preference data if new user has no meaningful data
    if (!existing.name && oldPrefs.name) patch.name = oldPrefs.name;
    if ((!existing.bestWorkTimes || existing.bestWorkTimes.length === 0) && oldPrefs.bestWorkTimes?.length > 0) {
      patch.bestWorkTimes = oldPrefs.bestWorkTimes;
    }
    if ((!existing.difficulties || existing.difficulties.length === 0) && oldPrefs.difficulties?.length > 0) {
      patch.difficulties = oldPrefs.difficulties;
    }
    if ((!existing.strengths || existing.strengths.length === 0) && oldPrefs.strengths?.length > 0) {
      patch.strengths = oldPrefs.strengths;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    await ctx.db.delete(oldPrefs._id);
  } else {
    await ctx.db.patch(oldPrefs._id, { userId: newUserId });
  }
}
```

This ensures:
1. `onboardingCompleted: true` is always preserved on the new user's record
2. Preference data (name, work times, difficulties, strengths) from onboarding is carried over if the new user's record is empty
3. The old record is still deleted to avoid duplicates

**Step 3: Verify**

1. Start emulator fresh (clear app data)
2. Complete onboarding as anonymous user
3. Go to Profile → Link Account → sign up with email
4. Expected: Stay on home screen, NOT redirected to onboarding
5. Check Convex dashboard: new user's preferences should have `onboardingCompleted: true`

**Step 4: Commit**

```bash
git add apps/convex/convex/migration.ts
git commit -m "fix: preserve onboardingCompleted flag during account merge migration"
```
