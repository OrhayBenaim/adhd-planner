# ProfileSheet Refactor — Extract Auth Components

## Problem

`ProfileSheet.tsx` (660+ lines) handles too many responsibilities: name editing, social auth, email sign-up, email sign-in, account management, and sub-view routing. The onboarding `sign-in.tsx` duplicates most of the same auth UI and logic.

## Design

### Shared Auth Components (`components/auth/`)

Context-agnostic components usable from both ProfileSheet and onboarding:

| Component | Responsibility |
|---|---|
| `SocialAuthButtons` | Platform-aware Google/Apple buttons + Email option |
| `EmailForm` | Email + password inputs + gradient submit button |
| `SignUpWithEmail` | Owns email/password state + `authClient.signUp.email` handler, uses EmailForm |
| `SignInWithEmail` | Owns email/password state + `authClient.signIn.email` handler, uses EmailForm |
| `LinkAccountOptions` | Header + SocialAuthButtons, navigates to SignUpWithEmail |
| `SignInOptions` | Header + SocialAuthButtons, navigates to SignInWithEmail |

Each accepts callbacks for context-specific behavior:
- `onSuccess` — ProfileSheet: `closeSheet()`, Onboarding: `router.replace("/")`
- `onBeforeAuth?` — Onboarding passes `saveOnboardingData()`, ProfileSheet omits
- `name?` — for sign-up: onboarding passes `state.name`, ProfileSheet passes `userName`
- `onNavigate` — to switch between sub-views (back, go to email form, etc.)

### ProfileSheet (`sheets/ProfileSheet.tsx`)

Becomes a thin shell:
- BottomSheet wrapper with snap points and close handling
- Sub-view state machine routing
- Name editing state (persists across sub-views, saves on close)
- Delegates to: `AnonymousProfile`, `AuthenticatedProfile`, and shared auth components

### Profile-specific components (`sheets/profile/`)

| Component | Responsibility |
|---|---|
| `AnonymousProfile` | Avatar, name input, benefit message, "Link Account" CTA, "Sign in" link |
| `AuthenticatedProfile` | Avatar/photo, name, email, provider badge, sign out, delete account |

### Onboarding sign-in (`(onboarding)/sign-in.tsx`)

Keeps its own main view (cloud icon, "save your progress" pitch, skip button) but replaces duplicated auth UI with shared components from `components/auth/`.

## File Structure

```
src/components/
  auth/
    SocialAuthButtons.tsx
    EmailForm.tsx
    SignUpWithEmail.tsx
    SignInWithEmail.tsx
    LinkAccountOptions.tsx
    SignInOptions.tsx
  sheets/
    ProfileSheet.tsx          (simplified shell)
    profile/
      AnonymousProfile.tsx
      AuthenticatedProfile.tsx
```

## What Stays Unique

| Context | Unique Parts |
|---|---|
| ProfileSheet | AnonymousProfile, AuthenticatedProfile, name editing, BottomSheet shell |
| Onboarding | Cloud icon pitch view, skip button, `saveOnboardingData()` pre-auth hook |
