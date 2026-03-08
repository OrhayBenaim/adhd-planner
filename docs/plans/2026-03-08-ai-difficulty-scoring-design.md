# AI Task Difficulty Scoring & Task Selection

## Overview

Two changes: (1) AI scores task difficulty on creation via OpenRouter, (2) task selection is improved with proper date handling and a configurable lookahead window.

## Data Model Changes

### `users` table (new field)

- `aiEnabled: boolean` — defaults to `true`. Server-only, no client mutation exposed.

### `tasks` table (changes)

- `difficulty`: uses `-1` as "pending AI score" sentinel (never selected by task picker)
- `dueDate`: **required** string, stored as ISO date (e.g., `2026-03-08`). Converted on creation from user selection:
  - "Today" → today's date
  - "Tomorrow" → tomorrow's date
  - "End of Week" → coming Friday
  - "Custom" → user picks a date
- `dueTime`: **required** string, stored as time (e.g., `12:00`). Converted on creation:
  - "By Noon" → `12:00`
  - "By Afternoon" → `15:00`
  - "By End of Day" → `21:00`
  - "Custom" → user inputs a time

## Task Creation Flow

```
User taps confirm
  → client converts day/time enums to real date/time values
  → createTask saves task with difficulty: -1, dueDate, dueTime
  → schedules scoreTaskDifficulty action
  → action checks user.aiEnabled
    → false: update difficulty to 0, alert
    → true: call OpenRouter (title only)
      → success: update difficulty with score (0-100)
      → failure: update difficulty to 0, alert
        // TODO: send to Datadog
```

## Task Selection Logic

When user wants a task:

1. **Filter**: incomplete tasks with `difficulty >= 0` and `dueDate` within `MAX_DUE_DATE_RANGE_DAYS` days from now
2. **Sort**: by `dueDate` ascending (soonest first)
3. **Pick**: from sorted list, find the task with difficulty closest to user's mood

`MAX_DUE_DATE_RANGE_DAYS` — Convex env var, defaults to `3`.

## Staleness Metric

- Tasks with `difficulty: -1` for over 5 minutes indicate a problem
- // TODO: wire staleness alert to Datadog

## OpenRouter Integration

- **API key**: Convex env var `OPENROUTER_API_KEY`
- **Model**: empty string — let OpenRouter auto-select
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Prompt**: score task difficulty 0-100 for an ADHD user, given the title, return just the number

## Security

- `aiEnabled` — no client mutation, server/dashboard only
- OpenRouter API key stored as Convex env var, never reaches client
- Scoring action validates auth before running

## Not in Scope

- User onboarding / personalization (planned for later)
- Datadog integration (placeholder comments only)
- Global kill switch (per-user only for now)
- Manual difficulty editing by user
