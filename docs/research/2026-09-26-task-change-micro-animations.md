# Home "Next step" task-change micro-animations

Research date: 2026-09-26. Scope: how the single task slot on Home should animate when a task completes, when the next task or an empty state replaces it, and under Reduce Motion. No code changed. Sections marked **Cited** are sourced; sections marked **Recommendation** are my proposal for Lullio.

## Main finding

Pick the motion from how the two states relate, then set its strength by frequency. Material 3 gives each relationship its own pattern. **Shared axis** is for elements with a spatial or navigational relationship, **fade through** is for elements without a strong relationship, and **fade** is for elements appearing within the screen. [M3 motion on Android](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) Apple says motion on frequent interactions should be brief and precise, and people should not have to wait for an animation. [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

The slot has three relationships. Task to next task is a queue advancing, so it suits a shared Y axis. Moving between a task and an empty state changes what the slot is, so it suits fade through or a scale-in. Moving between two empty states is a minor content change, so it suits a plain fade. "All done" is the only rare event and the only one that should celebrate.

One problem blocks the Reduce Motion fallback. Reanimated's default `ReduceMotion.System` jumps entering animations to their end state and skips exiting animations. [Reanimated: accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility) For Reduce Motion users that is exactly today's instant swap, which the user finds hard to notice. The fallback therefore has to be built explicitly.

## Strongest primary references

| Source | Cited fact | Implication for Lullio |
| --- | --- | --- |
| [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | "Aim for brevity and precision in feedback animations." "In apps, generally avoid adding motion to UI interactions that occur frequently." "Let people cancel motion… don't make people wait for an animation to complete." | Completing a task happens often, so transition 1 must be short (about 300 ms) and must not block the next tap. |
| [Apple HIG: Accessibility › Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility) | With Reduce Motion on, apps should tighten springs to reduce bounce, replace x/y/z transitions with fades, and avoid animating depth changes. | The reduced-motion variant is an opacity crossfade, not nothing. |
| [M3 motion tokens (material-components-android)](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) | Emphasized decelerate `cubic-bezier(0.05,0.7,0.1,1)` for entering and emphasized accelerate `(0.3,0,0.8,0.15)` for exiting. Standard `(0.2,0,0,1)`. Durations: short3 150 ms, short4 200 ms, medium2 300 ms, medium4 400 ms, long1 450 ms. Springs: default spatial damping ratio 0.9 / stiffness 700 for partial-screen motion, default effects 1.0 / 1600 for opacity-type properties. Fade defaults: 150 ms enter, 75 ms exit. Fade through and shared axis: 300 ms. | Gives concrete, citable numbers instead of guesses. |
| M3 transition source: [MaterialFadeThrough](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/MaterialFadeThrough.java), [FadeThroughProvider](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/FadeThroughProvider.java), [MaterialFade](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/MaterialFade.java), [dimens.xml](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/res/values/dimens.xml) | In fade through, incoming content starts at scale **0.92**, and outgoing content finishes fading at **35%** of the duration before incoming starts. In fade, incoming content starts at scale **0.8**, finishes fading in at **30%**, and outgoing content only fades. Shared-axis slide distance is **30 dp**. | Offsets and scales for transitions 1–4 come from here. |
| [SwiftUI `Animation.default`](https://developer.apple.com/documentation/swiftui/animation/default) | Since iOS 17 the default is a spring with response 0.55 and damping fraction 1.0, which does not bounce. | Platform defaults are critically damped. Bounce is an opt-in accent. |
| [Reanimated `withSpring`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring) and the installed 4.2.1 `springConfigs.ts` | Defaults are **mass 4**, stiffness 900, damping 120. | `SPRING_BOUNCY` sets no mass, so it runs at mass 4. My calculation gives a damping ratio of about 0.29 (about 39% overshoot). That is fine for a 0.94 press-scale but far too bouncy for moving a whole card. New configs must set `mass: 1`. |
| [Reanimated layout animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations), [custom animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/custom-animations), [Keyframe](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/keyframe-animations), [layout transitions](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions) | Presets default to 300 ms. `.springify()` disables time modifiers. Custom entering/exiting worklets may use `withTiming`, `withSpring` and `withDelay`. Keyframe easing is linear unless set on the destination keyframe, and the default duration is 500 ms. `LinearTransition` animates size and position changes, 300 ms by default. | Exact offsets need custom worklets. A multi-beat celebration suits Keyframe. Height changes of siblings suit `LinearTransition`. |
| [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Motion triggered by interaction must be possible to disable. The definition of "motion animation" excludes opacity-only changes that don't affect perceived size, shape or position. | Opacity-only fades are allowed under Reduce Motion. |
| [WCAG 2.2.2 Understanding](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html), [W3C COGA design guide](https://www.w3.org/TR/coga-usable/design_guide.html) | "Certain groups, particularly those with attention deficit disorders, find blinking content distracting." "Moving content can also be a severe distraction." COGA's "Help Users Focus" objective includes "Limit Interruptions". | This is the most credible first-party ADHD motion guidance I found. Celebrations should be one-shot, short, and without flashing or looping particles. |

**First-party app evidence (Cited, and limited).** Todoist documents that a completed task "disappears from the list" and optionally plays a completion tone. [Todoist: Introduction to tasks](https://todoist.com/help/articles/introduction-to-tasks-080OAXric) Clearing a view shows a dedicated "Todoist Zero" screen. [Todoist guide](https://www.todoist.com/inspiration/how-to-use-todoist-effectively) Tiimo advertises "confetti and sound, each time you check off a task". [Tiimo](https://www.tiimoapp.com/resource-hub/avoid-losing-motivation-and-celebrate-your-wins) Structured declares Reduced Motion support on its [App Store listing](https://apps.apple.com/us/app/structured-daily-planner-todo/id1499198946). Duolingo reworked its streak *milestone* animation because the old one was "not quite celebratory enough, energy-wise". [Duolingo blog](https://blog.duolingo.com/streak-milestone-design-animation/) That article covers rare milestones, not every answer.

**Not verified.** None of these sources gives durations or easings. I could not find primary documentation of the actual completion or next-item motion in Things 3, TickTick, Finch or Structured. Things' docs only show a Logging setting (Manual/Daily) for when completed items leave a list. [Things release notes](https://culturedcode.com/things/support/articles/1100684/) Nothing here is a claim about how those apps animate.

## Recommendations per transition

Everything below is my recommendation, derived from the cited tokens. t = 0 is the moment `handleComplete` clears the task (today that happens *after* `await completeTask`). Define three new configs next to `SPRING_BOUNCY`:
- `SPRING_SLOT = { stiffness: 700, damping: 48, mass: 1 }`. This is M3 default spatial: ratio 0.9 gives about 0.2% overshoot and a crisp stop.
- `SPRING_POP = { stiffness: 500, damping: 27, mass: 1 }`. This is ratio about 0.6, a single visible overshoot, reserved for the celebration.
- Easings `EMPH_DECEL = Easing.bezier(0.05,0.7,0.1,1)` and `EMPH_ACCEL = Easing.bezier(0.3,0,0.8,0.15)`.

### 1. Task done → next task (frequent, so crisp): "queue advances" on the Y axis
- **Before t = 0:** keep the existing press-scale on Done (0.94, `SPRING_BOUNCY`) as immediate tap feedback. It also covers the network await.
- **Exit, 0–150 ms:** opacity 1→0, translateY 0→−16 px, scale 1→0.98, `EMPH_ACCEL`. The card leaves upward, toward the XP bar and the toast.
- **Enter, starting at 60 ms:** opacity 0→1 over 150 ms (`EMPH_DECEL`), translateY +24→0 with `SPRING_SLOT`, which settles visually by about 350 ms. Offsets are just under M3's 30 dp shared-axis distance, because the card is large and close to the thumb.
- **Toast:** keep firing at t = 0 (200 ms fade-in, −40 px drift). It moves the same direction as the exiting card, so they read together. The XP bar fill (600 ms) runs in parallel.
- **Primitive:** key the card wrapper by `task._id`, and give it custom `entering`/`exiting` worklets (custom animations). The new card must be interactive immediately, so never gate taps on animation callbacks.

### 2. Last task done → "All done" (rare, so the one celebration)
- **Exit:** same as #1 (150 ms up and out), so every completion starts the same way.
- **Dog, 120–570 ms:** Keyframe over 450 ms (M3 long1). At 0 it is scale 0.8 and opacity 0. At 30% opacity is 1 and scale is 1.04 (`EMPH_DECEL`). At 100% scale is 1 (standard easing). Start scale and fade point follow M3 Fade (0.8, 30%). Optionally add one 8 px hop after it lands (up 120 ms, down with `SPRING_POP`), played once.
- **Text and button:** the title fades up 8 px at 250 ms, the copy at 310 ms, and the "Add a task" button at 370 ms. Each takes 200 ms with `EMPH_DECEL`, a 60 ms stagger. Everything is at rest by about 600 ms.
- **Celebration budget:** no confetti burst, no flashing, no loop. At most 3–5 small static sparkles that scale 0→1 and fade out within 600 ms total, well under WCAG 2.2.2's 5 s bound. Start the idle `FloatingDog` bob only after the entrance ends. A success haptic at t = 0 adds reward without extra motion.
- **Toast:** unchanged at t = 0. It peaks at about 200 ms, before the dog lands at about 400 ms. The two beats read as "points, then done".

### 3. Empty state → task appears (added, or the mood slider now matches): "slot fills" on the Z axis
- **Exit:** empty state opacity 1→0 over 105 ms, which is 35% of 300 ms, with no movement.
- **Enter, starting at 105 ms:** card opacity 0→1 over 195 ms, scale 0.92→1 with `SPRING_SLOT`. This is M3 fade through. Scaling instead of sliding tells the user this is a different kind of change from #1.
- **Height change:** the empty state and the card differ in height, so put `LinearTransition.duration(200)` on the siblings below (the AI banner), matching `PlanScreen`.
- **Mood slider:** matches can flip on every drag step. Keep exits at or under 105 ms so rapid changes don't pile up ghost views. Consider evaluating only on slider release, which follows HIG's "let people cancel motion".

### 4. Empty state ↔ empty state (e.g. No energy match → Nothing planned): quiet fade
- The container stays still. Key only the illustration, title and copy. Outgoing fades over 75 ms and incoming over 150 ms (M3 Fade), with the new dog scaling 0.96→1 over the same 150 ms. The unchanged "Add a task" button does not animate, so the eye lands on what changed.

### 5. Reduce Motion
- Read `useReducedMotion()`. Note that it reflects the setting at app startup. [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility)
- When it is true, use **opacity-only** variants and mark them `.reduceMotion(ReduceMotion.Never)`. Otherwise Reanimated jumps or skips them, and the swap goes back to being invisible.
- Variants: #1 and #3 become an outgoing fade of 100 ms, then an incoming fade of 200 ms. #2 becomes a static "All done" layout that fades in over 250 ms, with no scale, hop, sparkles or idle bob; the haptic stays. #4 stays as a 75/150 ms fade.
- **Check the toast:** under Reduce Motion, Reanimated's `withSequence` "only starts animations configured to bypass reduced motion". `PointsToast`'s opacity sequence may therefore never show. Test it on a device with Reduce Motion on.

## Open risks to check on device
- `handleComplete` sets the task to `null` before the auto-pick effect picks the next one. That may render the empty state for one frame, which would trigger #3 instead of #1. Derive the slot key so a pending auto-pick doesn't count as "empty".
- I did not confirm from the docs whether a Reanimated exiting view and its keyed replacement overlap in place or stack. If they stack, absolutely position the exiting layer.
