# AI Task Difficulty Scoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI scores task difficulty (0-100) via OpenRouter when a task is created, and task selection uses due dates + mood matching with a configurable lookahead window.

**Architecture:** Convex mutation creates tasks with `difficulty: -1` (sentinel), then schedules an `internalAction` that calls OpenRouter. The action updates the task via `internalMutation`. A per-user `aiEnabled` flag (server-only) acts as a kill switch. The mobile client converts day/time enum selections to ISO dates/times before sending to Convex.

**Tech Stack:** Convex (backend actions, mutations, scheduler), OpenRouter API (chat completions), React Native/Expo (mobile client)

---

### Task 1: Add `userSettings` table to Convex schema

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Update schema**

Add `userSettings` table with `aiEnabled` boolean:

```typescript
userSettings: defineTable({
  userId: v.string(),
  aiEnabled: v.boolean(),
}).index("by_user", ["userId"]),
```

Also update `tasks` table — make `dueDate` and `dueTime` required (remove `v.optional`):

```typescript
tasks: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  difficulty: v.number(),
  completed: v.boolean(),
  dueDate: v.string(),
  dueTime: v.string(),
}).index("by_user", ["userId"]),
```

**Step 2: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "feat(convex): add userSettings table, make dueDate/dueTime required"
```

---

### Task 2: Update shared types

**Files:**
- Modify: `packages/types/src/index.ts`

**Step 1: Update Task interface**

Make `dueDate` and `dueTime` required. Remove `?` from both fields:

```typescript
export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: number;
  completed: boolean;
  dueDate: string;
  dueTime: string;
  _creationTime: number;
}
```

**Step 2: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): make dueDate/dueTime required on Task"
```

---

### Task 3: Create date/time conversion utility

**Files:**
- Create: `apps/mobile/src/lib/dateTimeConvert.ts`

**Step 1: Write the utility**

Converts the day/time enum strings from sheets to ISO date and HH:mm time strings:

```typescript
// apps/mobile/src/lib/dateTimeConvert.ts

/**
 * Convert day selection enum to ISO date string (YYYY-MM-DD).
 */
export function daySelectionToDate(day: string): string {
  const now = new Date();

  switch (day) {
    case "today":
      return formatDate(now);
    case "tomorrow": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return formatDate(d);
    }
    case "end_of_week": {
      const d = new Date(now);
      const dayOfWeek = d.getDay(); // 0=Sun, 5=Fri
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // if Sat, next Fri = 6 days
      d.setDate(d.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
      return formatDate(d);
    }
    default:
      // Custom — assume ISO date string passed through
      return day;
  }
}

/**
 * Convert time selection enum to HH:mm string.
 */
export function timeSelectionToTime(time: string): string {
  switch (time) {
    case "noon":
      return "12:00";
    case "afternoon":
      return "15:00";
    case "end_of_day":
      return "21:00";
    default:
      // Custom — pass through (e.g. "14:30")
      return time;
  }
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/lib/dateTimeConvert.ts
git commit -m "feat(mobile): add date/time enum-to-value conversion utility"
```

---

### Task 4: Create internal mutation for updating task difficulty

**Files:**
- Create: `apps/convex/convex/ai.ts`

**Step 1: Write the internal mutation**

This is called by the scoring action after OpenRouter responds (or on failure):

```typescript
// apps/convex/convex/ai.ts
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const updateTaskDifficulty = internalMutation({
  args: {
    taskId: v.id("tasks"),
    difficulty: v.number(),
  },
  handler: async (ctx, { taskId, difficulty }) => {
    await ctx.db.patch(taskId, { difficulty });
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat(convex): add internal mutation for updating task difficulty"
```

---

### Task 5: Create OpenRouter scoring action

**Files:**
- Modify: `apps/convex/convex/ai.ts`

**Step 1: Add the scoring action**

Append to `ai.ts`. This is an `internalAction` scheduled by `createTask`:

```typescript
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const scoreTaskDifficulty = internalAction({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { taskId, userId, title }) => {
    // Check kill switch
    const settings = await ctx.runQuery(internal.ai.getUserAiEnabled, { userId });
    if (!settings) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      // TODO: alert to Datadog — AI disabled for user
      console.warn(`[AI] aiEnabled=false for user ${userId}, task ${taskId} set to 0`);
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      // TODO: alert to Datadog — missing API key
      console.error(`[AI] OPENROUTER_API_KEY not set, task ${taskId} set to 0`);
      return;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "",
          messages: [
            {
              role: "system",
              content:
                "You are a task difficulty scorer for an ADHD planner app. " +
                "Given a task title, rate its difficulty from 0 to 100. " +
                "0 = trivially easy (e.g. drink water), 100 = extremely difficult (e.g. write a thesis). " +
                "Consider cognitive load, time required, and executive function demand. " +
                "Respond with ONLY the number, nothing else.",
            },
            {
              role: "user",
              content: title,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      const score = parseInt(raw, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Invalid score from AI: "${raw}"`);
      }

      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: score });
    } catch (error) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      // TODO: alert to Datadog
      console.error(`[AI] scoring failed for task ${taskId}:`, error);
    }
  },
});
```

**Step 2: Add the internal query for checking aiEnabled**

Also in `ai.ts`:

```typescript
import { internalQuery } from "./_generated/server";

export const getUserAiEnabled = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Default to true if no settings row exists
    return settings?.aiEnabled ?? true;
  },
});
```

**Step 3: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat(convex): add OpenRouter scoring action with kill switch check"
```

---

### Task 6: Update `createTask` mutation

**Files:**
- Modify: `apps/convex/convex/tasks.ts`

**Step 1: Update create mutation**

- Remove `difficulty` from client args (hardcode `-1`)
- Make `dueDate` and `dueTime` required args
- Schedule the scoring action after insert

```typescript
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.string(),
    dueTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      userId,
      difficulty: -1,
      completed: false,
    });

    // Schedule AI difficulty scoring in the background
    await ctx.scheduler.runAfter(0, internal.ai.scoreTaskDifficulty, {
      taskId,
      userId,
      title: args.title,
    });

    return taskId;
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/tasks.ts
git commit -m "feat(convex): createTask hardcodes difficulty=-1, schedules AI scoring"
```

---

### Task 7: Update mobile task creation flow

**Files:**
- Modify: `apps/mobile/src/hooks/useTasks.ts`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Update `CreateTaskInput` type — remove difficulty, make dates required**

In `useTasks.ts`:

```typescript
export type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate: string;
  dueTime: string;
};
```

**Step 2: Update `HomeProvider` — remove difficulty from createTask args**

In `HomeProvider.tsx`, update the `createTask` function signature and `HomeContextValue`:

```typescript
// In HomeContextValue interface:
createTask: (args: { title: string; dueDate: string; dueTime: string }) => Promise<void>;

// In createTask callback:
const createTask = useCallback(
  async (args: { title: string; dueDate: string; dueTime: string }) => {
    await createTaskMutation(args);
  },
  [createTaskMutation]
);
```

**Step 3: Update `SheetManager` — convert enums, remove difficulty/moodLevel**

In `SheetManager.tsx`:

- Import the conversion utilities
- Remove `moodLevel` from `useHome()` destructuring
- Update `handleDaySelected` to convert day enum to ISO date via `daySelectionToDate()`
- Update `handleTimeSelected` to convert time enum via `timeSelectionToTime()` and stop passing `difficulty`

```typescript
import { daySelectionToDate, timeSelectionToTime } from "../../lib/dateTimeConvert";

// In SheetManager function — remove moodLevel from useHome():
const {
  tasks,
  settings,
  createTask,
  deleteTask,
  updateSetting,
  openSheet,
  closeSheet,
  registerSheet,
} = useHome();

// Update handleDaySelected:
const handleDaySelected = useCallback((day: string) => {
  if (day === "custom") {
    setShowCustomDay(true);
    return;
  }
  setSelectedDay(daySelectionToDate(day));
  setShowCustomDay(false);
  nextSheetRef.current = "selectTime";
  daySheetRef.current?.close();
}, []);

// Update handleTimeSelected:
const handleTimeSelected = useCallback(
  async (time: string) => {
    if (time === "custom") {
      setShowCustomTime(true);
      return;
    }
    closeSheet();
    await createTask({
      title: pendingTaskTitle,
      dueDate: selectedDay,
      dueTime: timeSelectionToTime(time),
    });
    setPendingTaskTitle("");
    setSelectedDay("");
  },
  [closeSheet, createTask, pendingTaskTitle, selectedDay]
);
```

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useTasks.ts apps/mobile/src/components/home/HomeProvider.tsx apps/mobile/src/components/home/SheetManager.tsx
git commit -m "feat(mobile): convert day/time enums to real values, remove client-side difficulty"
```

---

### Task 8: Update task selection logic

**Files:**
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Update `handleAIPick`**

Replace the current heuristic with: filter by `difficulty >= 0` + due within range, sort by date, pick closest to mood:

```typescript
const handleAIPick = useCallback(() => {
  const now = new Date();
  const maxDaysAhead = 3; // Mirrors Convex env MAX_DUE_DATE_RANGE_DAYS

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + maxDaysAhead);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const eligible = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.difficulty >= 0 &&
        t.dueDate >= todayStr &&
        t.dueDate <= cutoffStr
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (!eligible.length) return;

  const ease = { duration: 300, easing: Easing.out(Easing.quad) };
  const settle = { duration: 400, easing: Easing.inOut(Easing.quad) };

  aiRotate.value = withSequence(
    withTiming(0.04, ease),
    withTiming(-0.04, ease),
    withTiming(0, settle)
  );
  aiScale.value = withSequence(
    withTiming(1.06, ease),
    withTiming(1, settle)
  );

  const best = eligible.reduce((prev, curr) =>
    Math.abs(curr.difficulty - moodLevel) < Math.abs(prev.difficulty - moodLevel)
      ? curr
      : prev
  );
  setTimeout(() => setSelectedTask(best), 500);
}, [tasks, moodLevel, setSelectedTask, aiRotate, aiScale]);
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat(mobile): task selection filters by date range and difficulty >= 0"
```

---

### Task 9: Add staleness monitoring query

**Files:**
- Modify: `apps/convex/convex/ai.ts`

**Step 1: Add staleness query**

An internal query that returns tasks stuck at `difficulty: -1` for over 5 minutes:

```typescript
export const getStaleScoringTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const allTasks = await ctx.db.query("tasks").collect();
    return allTasks.filter(
      (t) => t.difficulty === -1 && t._creationTime < fiveMinutesAgo
    );
    // TODO: wire to Datadog alerting
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat(convex): add staleness monitoring query for unscored tasks"
```

---

### Task 10: Set Convex environment variables

**Step 1: Set env vars via Convex dashboard or CLI**

```bash
npx convex env set OPENROUTER_API_KEY "your-openrouter-api-key"
npx convex env set MAX_DUE_DATE_RANGE_DAYS "3"
```

**Step 2: Verify deployment**

```bash
cd apps/convex && npx convex dev
```

---

### Task 11: End-to-end manual test

**Step 1: Create a task in the app**

- Open the app, add a task (e.g., "Clean the kitchen")
- Select a day and time
- Verify the task appears with difficulty showing as pending/unscored initially

**Step 2: Verify AI scoring**

- Check the Convex dashboard — the task's `difficulty` field should update from `-1` to a 0-100 score within seconds

**Step 3: Verify task selection**

- Set mood slider to various levels
- Tap the sparkles button
- Verify it selects tasks due within 3 days, picking the one closest to your mood

**Step 4: Verify kill switch**

- In Convex dashboard, insert a `userSettings` row with `aiEnabled: false`
- Create another task
- Verify it gets `difficulty: 0` instead of an AI score
