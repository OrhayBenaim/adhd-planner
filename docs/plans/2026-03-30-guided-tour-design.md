# Guided Tour Design

Post-onboarding guided tour that walks new users through creating and completing their first task.

## Goal

After onboarding, users land on the home screen with no context. The tour guides them through the core loop: create a task, understand the mood meter, use AI pick, and complete the task.

## Flow

### Entry

- Confetti message changes from "Let's gooo! Time to crush it!" to "You're all set, [name]!"
- After confetti fades, an inline intro card appears: "Let me show you around. It'll take 30 seconds."
- Two buttons: "Let's go" (starts tour) / "Skip" (ends tour, marks complete)
- Once the tour starts, there is no skip. The user completes all steps.

### Tour Steps

| # | Name | Type | Title | Description | Advances when |
|---|------|------|-------|-------------|---------------|
| 1 | Create first task | Action-gated | Add your first task | What do you need to get done? Tap below to get started. | User taps the inline CTA |
| 2 | Pick a day | Action-gated | When do you want to do this? | Pick a day. We'll use this to plan your schedule and send reminders. | User selects a date |
| 3 | Pick a time | Action-gated | What time works best? | We'll match this to your focus times from onboarding. | User selects a time |
| 4 | Mood meter | Button-gated | How are you feeling? | Slide to set your energy level. We'll suggest tasks that match how you're feeling right now. | User taps "Got it" |
| 5 | AI Pick | Action-gated | Your personal task picker | Tap here and we'll find the best task for your mood and energy. | User taps the AI pick button |
| 6 | Complete task | Action-gated | Nice! Now let's crush it | When you're done, tap the task to mark it complete and earn XP. | User completes the task |
| 7 | Celebration + Pro | Button-gated | You're ready! | That's the core loop. Add tasks, match your mood, and get things done. | User taps "Let's start!" |

Step 7 includes a subtle secondary line: "Pro members also get AI coaching, streak tracking, and personalized reminders."

### Overlay Style

- Frosted blur background (expo-blur) covering full screen
- Cutout around the target element (stays visible and interactive)
- Floating tooltip card (white, rounded, soft shadow) positioned above or below the target
- Card contains: title, description, and primary button (for button-gated steps)
- Steps 1 and intro are inline cards (no overlay, shown in the content area)
- Steps 2-3 render the overlay inside the AddTaskSheet, not on top of it

## PostHog Events (Funnel)

- `guided_tour_shown` - intro card displayed
- `guided_tour_started` - user tapped "Let's go"
- `guided_tour_skipped` - user tapped "Skip"
- `guided_tour_step_viewed` with `{ step: number, stepName: string }` - each step
- `guided_tour_task_created` - user created their first task during tour
- `guided_tour_task_completed` - user completed the task during tour
- `guided_tour_completed` - user reached the final step

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/components/tour/GuidedTourProvider.tsx` | Context. Manages currentStep, isActive, advance/skip, PostHog events |
| `src/components/tour/TourOverlay.tsx` | Frosted blur overlay with cutout. Uses target ref measurements |
| `src/components/tour/TourTooltip.tsx` | Floating card (title, description, button) |
| `src/components/tour/TourIntroCard.tsx` | Inline intro card with Let's go / Skip |
| `src/components/tour/TourCelebration.tsx` | Final step card with pro mention |
| `src/components/tour/constants.ts` | Step definitions |

### State

- `hasCompletedTour` persisted in Convex `userPreferences` (new boolean field)
- `GuidedTourProvider` wraps HomeScreen (not the whole app)
- Provider exposes: `currentStep`, `isActive`, `advance()`, `skip()`, `isTourStep(stepName)`
- Components check `isTourStep()` to expose refs for overlay cutouts
- Cutout measurement via `onLayout` + `measure()` on target refs

### Integration Points

- `CelebrationOverlay.tsx`: Change message to "You're all set, [name]!"
- `index.tsx`: After celebration, mount GuidedTourProvider if !hasCompletedTour
- `HomeScreen.tsx`: Wrap in tour provider, pass refs for mood slider and AI pick button
- `AddTaskSheet.tsx` / date/time steps: Check tour context for overlay on steps 2-3
- `MainContent.tsx`: Show TourIntroCard and step 1 CTA when tour is active and no tasks exist
