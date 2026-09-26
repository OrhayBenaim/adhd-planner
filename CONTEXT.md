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

### Home

**Next step**:
The single task Home surfaces for the user to do now, chosen to fit their current mood.
_Avoid_: Current task, selected task, focus task

**Nothing planned**:
Home's empty state when the user has no incomplete tasks and completed none today.
_Avoid_: No tasks, empty list

**All done**:
Home's empty state when the user has no incomplete tasks and completed at least one today.
_Avoid_: Task zero, inbox zero, finished

**No energy match**:
Home's empty state when incomplete tasks exist but none fit the current mood.
_Avoid_: No match, filtered out
