# Figma frame map

Which Figma frame belongs to which product flow.

**File:** [ADHD](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD) (`uEKUhrvteSOfw9kRknd9I6`)

| Page | Node |
|------|------|
| [In progress](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-12) | `71:12` |
| [Production](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-13) | `71:13` |
| [Archive](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=329-1611) | `329:1611` |

Production holds the Lullio redesign under `193:28` (`Lullio / Redesign — shipped`).
Node IDs below are the 393×852 screen inside each flow wrapper.

---

## Onboarding

`welcome → difficulties → strengths → work-time → save-progress`

Code: `app/(onboarding)/*`, `OnboardingProvider.tsx`, `PreferenceStep.tsx`, `OnboardingAuth.tsx`

| Frame | Node | Step |
|-------|------|------|
| Welcome | `196:4` | welcome |
| Difficulties | `197:72` | difficulties |
| Strengths | `198:33` | strengths |
| Best times | `199:34` | work-time |
| Save progress | `259:369` | save-progress |
| Create account / options | `263:592` | save-progress (link account) |
| Sign in / options | `263:595` | welcome / save-progress (sign in) |
| Enable reminders | `263:598` | in-app reminder opt-in |

## Home

Daily loop on the home screen: mood → task card → complete.

Code: `HomeScreen.tsx`, `TaskCard.tsx`

| Frame | Node | Step |
|-------|------|------|
| Home | `201:36` | Home |
| Home / no match | `309:1032` | tasks exist but none match the current energy |

## Task creation

`idle → addTask → selectDay → selectTime → taskSummary`

Code: `taskCreationFlow.ts`, `TaskCreationFlowProvider.tsx`

| Frame | Node | Step |
|-------|------|------|
| Add task | `282:750` | addTask |
| Add task / voice | `282:839` | addTask (voice) |
| Pick a day | `284:778` | selectDay |
| Pick a time | `284:865` | selectTime |
| Review tasks | `284:952` | taskSummary |

## My plan

Code: `app/(app)/plan.tsx`, `PlanScreen.tsx`, `taskGroups.ts`

| Frame | Node | Step |
|-------|------|------|
| My plan | `280:724` | List |
| My plan / empty | `280:906` | Empty state |

## Insights

Code: `app/(app)/insights.tsx`, `InsightsScreen.tsx`, `BottomNav.tsx`

| Frame | Node | Step |
|-------|------|------|
| Insights | `320:1292` | Weekly stats |

## Settings

Code: `app/(app)/settings/index.tsx`, `components/settings/*`

| Frame | Node | Step |
|-------|------|------|
| Settings | `289:1293` | Settings |

## Preferences

Code: `app/(app)/settings/work-times.tsx`, `difficulties.tsx`, `strengths.tsx`, `onboarding/OptionRows.tsx`

| Frame | Node | Step |
|-------|------|------|
| Best work times | `289:1353` | Times |
| Difficulties | `273:979` | Difficulties |
| Strengths | `273:1074` | Strengths |
| Voice languages | `279:679` | Offline speech models |

## Profile

Code: `app/(app)/settings/profile.tsx`, `auth/AuthFlow.tsx`

| Frame | Node | Step |
|-------|------|------|
| Profile & account | `274:653` | main |
| Sign in / username | `300:935` | username sign-in form |
| Create account / username | `300:956` | username sign-up form |

## Achievements

Code: `app/(app)/settings/achievements.tsx`, `convex/achievementDefs.ts`

| Frame | Node | Step |
|-------|------|------|
| Achievements | `279:780` | Badge grid |

## Purchase

`upgrade tap → sign-in gate (anonymous only) → paywall`

Code: `app/sign-in-gate.tsx`, `app/paywall.tsx`, `app/(app)/settings/subscription.tsx`, `usePremium.tsx`

| Frame | Node | Step |
|-------|------|------|
| Sign-in gate / options | `300:977` | sign-in gate |
| Subscription | `274:737` | plan status and management |

## Guided tour

`intro → createTask → pickDay → pickTime → moodMeter → aiPick → completeTask → celebration → saveProgress`

Code: `guidedTourFlow.ts`, `guidedTourSteps.ts`

| Frame | Node | Step |
|-------|------|------|
| Tour / intro | `285:820` | intro |
| Tour / add a task | `285:897` | createTask |
| Tour / pick a day | `285:973` | pickDay |
| Tour / pick a time | `285:1078` | pickTime |
| Tour / mood meter | `286:876` | moodMeter |
| Tour / complete a task | `286:1030` | completeTask |
| Tour / celebration | `286:1106` | celebration |
| Tour / save progress | `313:1046` | saveProgress |
| Tour / save progress / options | `313:1122` | saveProgress (auth options) |

## Surveys

`invite → form → thank-you`, with a reminder banner when deferred.

Code: `components/surveys/*`, `useSurveyCampaign.ts`, `surveyPosthog.ts`

| Frame | Node | Step |
|-------|------|------|
| Survey invite | `305:1378` | invite |
| Survey reminder | `301:1137` | deferred |
| Survey / rating question | `305:1519` | rating question |
| Survey / open question | `305:1660` | open question |
| Survey / thank you | `305:1801` | reward granted |
| Survey reward | `301:1277` | reward granted (home) |

## Home banners

Code: `RatingPromptBanner.tsx`

| Frame | Node | Step |
|-------|------|------|
| Rating prompt | `301:997` | rating prompt |

## Not redesigned

Old-design surfaces still shipping as drawn. Section `329:1610` on Production.

Code: `LoadingScreen.tsx`, `AiCeilingBanner.tsx`, `PointsToast.tsx`, `ExitArmingToast.tsx`, `taskCreationFlow.ts`

| Frame | Node | Step |
|-------|------|------|
| Completed task | `9:287` | Home — completed task |
| Confirm (v1) / (v2) | `5:2`, `32:316` | Task creation — addTask (confirm) |
| Custom Day | `5:79` | Task creation — selectDay (custom) |
| Custom time | `5:147` | Task creation — selectTime (custom) |
| Edit task | `120:257` | Task creation — editing an existing task |
| Loading screen | `128:809` | app bootstrap |
| AI ceiling banner | `130:300` | AI limit reached |
| Points toast | `130:315` | task completed |
| Exit-arming toast | `130:321` | Android back armed |

## Store listing

Marketing creatives, not an in-app journey. Section `74:17` on Production.

| Frame | Node | Step |
|-------|------|------|
| Store 1–5 | `49:79`, `49:96`, `36:405`, `36:371`, `36:327` | Store listing |
| Store collage | `42:24` | Collage |
| Icon / Icon dark | `46:24`, `46:74` | App icon |

## Shared assets

`Icons and Assets` (`326:1611`) on Production. Clone from these instead of re-importing artwork.

| Asset | Node | Contents |
|-------|------|----------|
| Paw | `89:118` | Component, the Ionicons `paw` glyph used by the onboarding progress bar |
| ICON MASTERS (Ionicons) | `121:512` | One `ic/<name>` node per Ionicons glyph the app renders |
| LULLIO ICON MASTERS | `331:1295` | The hand-drawn SVGs in `assets/home/artwork.ts`: clock, flame, home, list, plus, settings, chart, chevron, trash |
| art/wave-divider | `332:1300` | The 393×20 header wave (`artwork.ts` → `wave`) |
| MASCOT MASTERS | `127:512` | `img/` — `dog-wave`, `dog-celebrate`, `dog-running`, `dog-star`, `ball`, `dog-floating`, `dog-clock`, `dog-reaching`, `dog-helping`, `dog-laundry` |
| Reusable elements | `193:32` | Buttons, navigation items, settings row, text field |

`dog-celebrate` is the same file as `assets/home/tour-celebration.png`; `dog-floating`,
`dog-clock` and `dog-reaching` are the same files as `assets/onboarding/floating.png`,
`clock.png` and `reaching.png`. One master each.

---

## In progress

Unshipped. Same flow names as Production when the frame is a draft of that journey.

| Frame | Node | Flow |
|-------|------|------|
| Lullio · Onboarding pink concept · draft | `161:2` | Onboarding concept, superseded |
| 05 / Home / flow | `232:785` | Home — earlier draft |
| 06 / Settings / flow | `232:870` | Settings — earlier draft |
| Implementation reference | `203:48` | Working notes for the Lullio redesign |
| Previous onboarding layouts / retained artwork | `259:368` | Artwork kept from the pre-Lullio onboarding |

## Archive

Superseded designs, grouped by the date they left Production.

| Section | Node | Contents |
|---------|------|----------|
| 2026-09-22 · pre-Lullio redesign | `329:1612` | Home, Task creation, Sheets, Onboarding, Guided tour, Routes, Overlays & banners |
