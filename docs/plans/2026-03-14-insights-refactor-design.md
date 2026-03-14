# Insights Refactor Design

**Date:** 2026-03-14
**Status:** Approved

## Problem

1. No visual affordance that insights exist — the XP bar is tappable but looks static
2. InsightsSheet is cluttered with icons and cryptic labels (e.g., "Avg" without context)
3. Too many stats, some not useful

## Design

### 1. Insights Button (MainContent)

- A "View Insights" button below the XP bar area, only for premium users
- Subtle rounded pill with "View Insights" label and a small chart icon
- Tapping opens the InsightsSheet

### 2. InsightsSheet — Simplified Layout

Top to bottom:

**Header:** "Your Insights" + close button (no ProBadge)

**Stat: Tasks This Week**
- Large number (e.g., "12")
- Label: "tasks completed this week"

**Stat: Best Day**
- Day name (e.g., "Tuesday")
- Label: "your most productive day"

**Stat: Streak**
- Large number for current streak (e.g., "5 days")
- Label: "current streak — best: 14 days"

**Chart: Daily Completions**
- Section title: "This Week"
- Bar chart with full 3-letter day names (Mon, Tue, Wed...) and count number on top of each bar
- 7-day window

### 3. Removed

- "Last Week" stat card
- "Avg. Difficulty" stat card
- Icons on stat cards
- ProBadge in header

### 4. Visual Style

- Each stat is its own row/card with large value + readable description below
- No icons — clean typography hierarchy (big number then description text)
- Existing color palette (#f5f7fa backgrounds, #1e2939 text)

## Files to Modify

- `apps/mobile/src/components/home/MainContent.tsx` — add "View Insights" button below XP bar
- `apps/mobile/src/components/sheets/InsightsSheet.tsx` — redesign sheet content
