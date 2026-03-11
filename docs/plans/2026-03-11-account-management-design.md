# Post-Onboarding Account Management Design

## Overview

Add a Profile tab to the bottom navigation that lets anonymous users link/sign-in to an account, and lets authenticated users view their profile and manage their account.

## Architecture

New bottom tab: Profile tab with user avatar icon in the bottom navigation.

### Anonymous User View

- Display name (from onboarding)
- Benefit message explaining why linking is valuable (data safety across devices)
- **Link Account** — Google (Android) / Apple (iOS) / Email sign-up. Uses existing `onLinkAccount` migration to upgrade anonymous user seamlessly
- **Sign In** — for users who already have an account on another device. Navigates to sign-in flow (Google/Apple/Email login). Discards anonymous data and signs into existing account

### Authenticated User View

- Profile image, name, email, provider badge (Google/Apple/Email)
- **Sign Out** button
- **Delete Account** — confirmation dialog, deletes all user data (tasks, preferences, settings, progress), signs out, lands at onboarding as fresh anonymous user

## Key Behaviors

- Once a user links or signs into a real account, anonymous sign-in in `app/index.tsx` does not trigger (session already exists)
- Data migration on link uses existing `onLinkAccount` + `migration.ts` infrastructure
- Sign-in to existing account discards local anonymous data (no merge)
- Delete account purges all Convex data for that user immediately

## Backend Changes

- New Convex mutation: `deleteAccount` — deletes from `userPreferences`, `tasks`, `userSettings`, `userProgress` tables, then invalidates session

## No Changes Needed

- Anonymous auto-sign-in logic stays as-is — only fires when `!session`
- Onboarding flow stays unchanged
