
  ---
  Free Tier

  - New user starts with no subscription
  - AI scoring works on task creation
  - After hitting cost ceiling ($1/mo), tasks get difficulty: -1
  - AI ceiling banner shows on home screen for unscored tasks
  - "Upgrade" button opens sign-in gate (anonymous) or paywall (signed in)

  Anonymous User Gating

  - Anonymous user tapping Upgrade → sign-in gate page (not paywall)
  - Social auth works from gate (Google/Apple)
  - Email sign-up works from gate
  - Email sign-in works from gate
  - After auth → redirects to paywall automatically
  - Device ID persists — re-creating anonymous session doesn't reset ceiling

  Purchase Flow

  - Paywall loads RevenueCat plans
  - Close button on paywall works
  - Monthly subscription purchase completes
  - Annual subscription purchase completes
  - Restore purchases works
  - Webhook updates subscriptions table in Convex

  Streaks (Premium)

  - Completing a task increments streak
  - Streak badge visible on home (premium only)
  - Streak badge hidden for free users
  - Missing a day resets streak (free)
  - Missing a day uses freeze (premium, max 1/week)
  - Longest streak tracks correctly

  Achievements (Premium)

  - Tapping streak badge opens achievements sheet
  - Locked = grey, unlocked = gradient
  - first_step — first task completed
  - hard_mode — complete task with difficulty >= 80
  - on_a_roll_3 — 3-day streak
  - unstoppable_7 — 7-day streak
  - level_5 / level_10 / level_25 — at those levels
  - weekly_warrior — 15+ tasks in a week

  Insights (Premium)

  - Tapping XP bar opens insights sheet (premium only)
  - Does nothing for free users
  - Weekly report numbers are correct
  - Most productive day shows correctly
  - Bar chart renders completion trends

  AI Coach (Premium)

  - Toggle appears in settings with PRO badge
  - Toggle works for premium users
  - Non-premium toggle tap → paywall
  - Setting persists across restarts
  - Cron job visible in Convex dashboard

  Settings UI

  - PRO badges on premium rows
  - Existing settings still work (notifications, sound, smart scheduling)

  Subscription Lifecycle

  - Purchase → isActive: true
  - Renewal → stays active, expiresAt updates
  - Cancellation → isActive: false
  - Expiration → premium features disabled

  Credit Packs

  - Consumable purchase triggers webhook
  - Credits added to aiCredits.balance
  - Scoring uses credits when over ceiling
  - Credits deducted after scoring

  Account Operations

  - Link anonymous → all data migrates (subscription, credits, streaks, achievements)
  - Delete account → all monetization data cleaned up

  Widgets

  - Widget data syncs to AsyncStorage on streak/task/XP change