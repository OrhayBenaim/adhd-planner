# Monetization Design — ADHD Planner

**Date:** 2026-03-12
**Goal:** Cover costs now, grow into revenue later. Lead with value, not restrictions.

---

## Philosophy

- Core task management is **always free** — never paywall someone in a moment of executive dysfunction
- Free users **experience AI magic** so they understand what they're paying for
- Premium = the app actively works *with* you (coaching, insights, engagement)
- Backend is the source of truth for all gating — UI only blocks for UX purposes
- All cost ceilings are backend-configurable — tune based on real usage data

---

## Tier Structure

### Free Tier — "Starter"

- Unlimited task creation (voice + text)
- Unlimited task completion & management
- Full XP & leveling system
- Mood slider & basic task picking
- AI difficulty scoring with **configurable cost ceiling** (backend-controlled per month)
- AI credit packs purchasable as top-up

### Premium Tier — "Pro"

- **$4.99/month** or **$39.99/year** ($3.33/mo)
- Everything in Free
- Higher AI scoring ceiling (backend-configurable)
- AI Coach Notifications (proactive, mood + time + history aware encouragement)
- Progress Insights & Weekly Report
- Achievements & Streaks (with weekly streak freeze)
- Home Screen Widgets (today's task, mood check-in, streak)
- Smartwatch Integration (voice task creation, quick complete)
- AI credit packs purchasable as top-up

### AI Credits (both tiers)

- Pay-as-you-go top-up when user hits their AI scoring ceiling
- Credit packs: $0.99 / $2.99 / $4.99 (exact credit amounts configurable on backend based on actual AI costs)
- Managed as consumable IAP through RevenueCat

---

## AI Cost Control System

### Backend-configurable settings (Convex)

- `freeTierCostCeiling` — max $ of AI usage per free user per month
- `premiumTierCostCeiling` — max $ of AI usage per premium user per month
- `aiCreditValue` — how much $ of AI usage one purchased credit gives
- All adjustable without app updates

### User flow when hitting ceiling

1. User creates a task
2. Backend checks current month's AI spend (already tracked in `userCosts`)
3. If under ceiling → score normally
4. If at ceiling → task created without AI score. User sees: *"You've used all your AI scoring this month. Upgrade to Pro or buy credits to keep scoring."*
5. Mood-based task picking still works for tasks that already have scores

---

## Premium Features Detail

### 1. AI Coach Notifications

**Types:**
- **Gentle nudges** — *"You've got 'call the dentist' waiting for 3 days. Today might be the day?"*
- **Energy-aware suggestions** — *"It's 2pm, you usually dip around now. Want to try something easy?"*
- **Wins & encouragement** — *"You finished 3 tasks today — that's your best Tuesday in weeks!"*
- **Streak reminders** — *"You're on a 5-day streak! Complete one task to keep it going"*
- **Overdue reframes** — *"You have 2 tasks from yesterday. No stress — want me to move them to today?"*

**How it works:**
- Backend scheduled job runs at smart intervals based on user's `bestWorkTimes` preference
- Uses mood history, task completion patterns, and ADHD profile (difficulties/strengths)
- LLM generates personalized notification text — warm, not robotic
- Max 3 notifications/day (configurable)
- User can customize notification types in settings (mute specific categories)

### 2. Progress Insights & Weekly Report

**Weekly report (push notification + in-app):**
- Tasks completed this week vs last week
- Most productive day & time
- Average task difficulty completed
- Streak length
- One AI-generated insight: *"You complete 60% more tasks before noon — try front-loading your hardest task"*

**In-app insights dashboard:**
- Completion trends over time (simple chart)
- Difficulty distribution — are you tackling harder tasks over time?
- Best days/times heatmap
- Mood vs productivity correlation

### 3. Achievements & Streaks

**Streaks:**
- Complete at least 1 task per day to maintain streak
- Streak freeze: 1 free "miss" per week (premium perk)
- Visual streak counter on home screen

**Achievements (unlockable badges):**
- "First Step" — complete your first task
- "On a Roll" — 3-day streak
- "Unstoppable" — 7-day streak
- "Hard Mode" — complete a task with difficulty 80+
- "Voice Commander" — create 10 tasks via voice
- "Weekly Warrior" — complete 15+ tasks in a week
- "Level Up" — reach level 5, 10, 25
- More added over time (configurable on backend)

**How they work:**
- Backend checks achievement conditions on task completion
- Toast/animation when unlocked
- Achievement gallery in profile or progress screen

### 4. Home Screen Widgets

- **"Today's Task"** — AI-suggested task based on current time + mood patterns, tap to open app
- **"Mood Check-in"** — quick mood slider, triggers AI task suggestion
- **"Streak"** — current streak count + XP progress

### 5. Smartwatch Integration (v2)

- **Voice create** — raise wrist, tap, speak a task. Created with AI scoring automatically
- **Quick complete** — see current suggested task, swipe/tap to mark done
- **Complication/tile** — streak count or next task at a glance
- Targets Apple Watch and Wear OS
- **Note:** Highest effort feature — ship after other premium features are live

---

## UI Gating

- Premium features show a small **"Pro" badge** in the UI
- Tapping a badged feature when not subscribed → opens paywall screen
- UI gating is for UX only — **backend is the source of truth** for all entitlement checks
- Convex checks entitlement before executing any premium action

---

## RevenueCat Integration

**RevenueCat handles:**
- Subscription management (monthly + annual plans)
- AI credit pack purchases (consumable IAP)
- Receipt validation (App Store + Google Play)
- Entitlement checking — `isPremium` flag
- Free trial support (if added later)
- A/B pricing experiments (without app updates)

**App-side flow:**
- On launch, check RevenueCat entitlement → set premium state
- Gate premium features behind entitlement
- Paywall screen shown when free user taps a premium feature
- Convex backend verifies entitlement for server-side features (notifications, insights, achievement checks)

**Credit packs (initial, adjustable via RevenueCat):**
- Small: $0.99
- Medium: $2.99
- Large: $4.99
