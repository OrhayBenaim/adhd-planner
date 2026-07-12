# Lullio

ADHD-friendly planner: home-centric mobile app with onboarding, task creation, and overlay surfaces.

## Language

### Navigation & dismissal

**Root screen**:
A screen with no prior destination to return to — Home, or the first onboarding Welcome form.
_Avoid_: Landing, main, entry

**Dismissible surface**:
UI that can be closed without leaving the current screen — bottom sheets, survey/rating overlays, guided tour, and sheet or welcome sub-views.
_Avoid_: Modal (overloaded), popup, window

**Back step**:
One level out of the current dismissible surface or flow (rewind sub-view / flow step, or close the surface when already at its root).
_Avoid_: Cancel, dismiss-all, escape

**Exit arming**:
The short window after the first back on a clean root screen during which a second back exits the app.
_Avoid_: Exit confirmation dialog, quit prompt
