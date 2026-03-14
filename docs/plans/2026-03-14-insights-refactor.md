# Insights Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a visible "View Insights" button for premium users and redesign the InsightsSheet to be clear and readable with fewer, better-labeled stats.

**Architecture:** Two-file change. MainContent.tsx gets a button below the XP bar. InsightsSheet.tsx is redesigned to show 4 stats (tasks this week, best day, streak, bar chart) with human-readable labels, no icons, and counts on chart bars.

**Tech Stack:** React Native, NativeWind, Gorhom Bottom Sheet, Convex queries

---

### Task 1: Add "View Insights" button to MainContent

**Files:**
- Modify: `apps/mobile/src/components/home/MainContent.tsx:125-139`

**Step 1: Replace the XP bar Pressable wrapper with a non-pressable View + add button below**

Remove the `Pressable` wrapper around the XP bar (lines 126-139) and add a dedicated "View Insights" button below it. The XP bar should no longer be tappable.

Replace this block:
```tsx
{/* XP bar — tap opens insights for premium */}
<Pressable
  onPress={isPremium ? () => openSheet("insights") : undefined}
>
  <View className="py-6">
    <View className="relative">
      <XPBar progress={progress} />
      <PointsToast
        points={toast.points}
        visible={toast.visible}
        onDone={hideToast}
      />
    </View>
  </View>
</Pressable>
```

With:
```tsx
{/* XP bar */}
<View className="py-6">
  <View className="relative">
    <XPBar progress={progress} />
    <PointsToast
      points={toast.points}
      visible={toast.visible}
      onDone={hideToast}
    />
  </View>
</View>

{/* View Insights button (premium only) */}
{isPremium && (
  <View className="items-center mb-2">
    <Pressable
      onPress={() => openSheet("insights")}
      className="flex-row items-center gap-1.5 bg-[#f0f4ff] px-4 py-2 rounded-full"
    >
      <Ionicons name="bar-chart-outline" size={14} color="#5b8def" />
      <Text className="text-sm font-medium text-[#5b8def]">
        View Insights
      </Text>
    </Pressable>
  </View>
)}
```

**Step 2: Verify Ionicons is already imported**

Check that `Ionicons` is imported in MainContent.tsx. If not, add:
```tsx
import { Ionicons } from "@expo/vector-icons";
```

**Step 3: Run typecheck**

Run: `cd apps/mobile && npm run typecheck`
Expected: No errors related to MainContent.tsx

**Step 4: Run react-doctor**

Run: `cd apps/mobile && npx -y react-doctor@latest .`
Expected: No new warnings (ignore icon-related warnings)

**Step 5: Commit**

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: add View Insights button below XP bar for premium users"
```

---

### Task 2: Redesign InsightsSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/InsightsSheet.tsx` (full rewrite)

**Step 1: Rewrite InsightsSheet.tsx**

Replace the entire file content with the redesigned version below. Key changes:
- Remove `StatCard` component (icon-based cards removed)
- Remove `ProBadge` import and usage
- Remove `Ionicons` import (no more icons in sheet)
- Rewrite `MiniBarChart` to show 3-letter day names and count numbers on bars
- Redesign layout: each stat is a simple row with large value + descriptive label
- Only show: tasks this week, best day, streak, bar chart

```tsx
import { forwardRef } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { useHome } from "../home/HomeProvider";
import { usePremium } from "../../hooks/usePremium";

interface Props {
  onClose: () => void;
}

function MiniBarChart({ data }: { data: Record<string, number> }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const max = Math.max(...last7.map((d) => data[d] ?? 0), 1);

  return (
    <View
      className="flex-row items-end justify-between gap-1 px-4"
      style={{ height: 120 }}
    >
      {last7.map((date) => {
        const count = data[date] ?? 0;
        const height = (count / max) * 80 + 4;
        const dayLabel = new Date(date + "T00:00:00Z").toLocaleDateString(
          "en-US",
          { weekday: "short" },
        );
        return (
          <View key={date} className="items-center flex-1">
            {count > 0 && (
              <Text className="text-xs font-semibold text-[#1e2939] mb-1">
                {count}
              </Text>
            )}
            <View
              style={{
                height,
                backgroundColor: count > 0 ? "#a2d2ff" : "#e5e7eb",
                borderRadius: 6,
                width: "100%",
              }}
            />
            <Text className="text-xs text-[#6a7282] mt-1">{dayLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const InsightsSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const { isPremium } = usePremium();
    const report = useQuery(
      api.insights.getWeeklyReport,
      isPremium ? {} : "skip",
    );
    const trends = useQuery(
      api.insights.getCompletionTrends,
      isPremium ? { days: 7 } : "skip",
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["70%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="px-6 pt-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-lg font-medium text-[#1e2939]">
                Your Insights
              </Text>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>

            {/* Tasks completed this week */}
            <View className="bg-[#f5f7fa] rounded-2xl p-4 mb-4">
              <Text className="text-3xl font-bold text-[#1e2939]">
                {report?.tasksCompletedThisWeek ?? 0}
              </Text>
              <Text className="text-sm text-[#6a7282] mt-1">
                tasks completed this week
              </Text>
            </View>

            {/* Best day + Streak row */}
            <View className="flex-row gap-3 mb-4">
              {/* Best day */}
              <View className="flex-1 bg-[#f5f7fa] rounded-2xl p-4">
                <Text className="text-xl font-bold text-[#1e2939]">
                  {report?.mostProductiveDay ?? "—"}
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  your most productive day
                </Text>
              </View>

              {/* Streak */}
              <View className="flex-1 bg-[#f5f7fa] rounded-2xl p-4">
                <Text className="text-xl font-bold text-[#1e2939]">
                  {report?.currentStreak ?? 0} days
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  current streak — best: {report?.longestStreak ?? 0}
                </Text>
              </View>
            </View>

            {/* Bar chart */}
            <Text className="text-sm font-medium text-[#1e2939] mb-3">
              This Week
            </Text>
            <View className="bg-[#f5f7fa] rounded-2xl py-4">
              <MiniBarChart data={trends ?? {}} />
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
```

**Step 2: Run typecheck**

Run: `cd apps/mobile && npm run typecheck`
Expected: No errors related to InsightsSheet.tsx

**Step 3: Run react-doctor**

Run: `cd apps/mobile && npx -y react-doctor@latest .`
Expected: No new warnings (ignore icon-related warnings)

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/InsightsSheet.tsx
git commit -m "feat: redesign InsightsSheet with clear labels and simplified stats"
```

---

### Task 3: Final Verification

**Step 1: Run full typecheck from root**

Run: `npm run typecheck`
Expected: All apps pass

**Step 2: Run mobile tests**

Run: `cd apps/mobile && npm test`
Expected: All tests pass

**Step 3: Final commit (if any fixes needed)**

Only if previous steps required changes.
