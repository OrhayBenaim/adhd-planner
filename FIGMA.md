# Figma frame map

Which Figma frame belongs to which product flow.

**File:** [ADHD](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD) (`uEKUhrvteSOfw9kRknd9I6`)

| Page | Node |
|------|------|
| [In progress](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-12) | `71:12` |
| [Production](https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-13) | `71:13` |

---

## Home

Daily loop on the home screen: mood → task card → complete.

Code: `HomeScreen.tsx`, `TaskCard.tsx`

| Frame | Node | Step |
|-------|------|------|
| Main | `9:216` | Home |
| Task | `1:588` | Active task |
| Completed task | `9:287` | Completed task |

## Task creation

`idle → addTask → selectDay → selectTime → taskSummary`

Code: `taskCreationFlow.ts`, `TaskCreationFlowProvider.tsx`

| Frame | Node | Step |
|-------|------|------|
| Create task | `1:2` | addTask |
| Edit task | `120:257` | addTask (editing an existing task) |
| Recording audio | `1:66`, `27:136` | addTask (voice) |
| Confirm | `5:2`, `32:316` | addTask (confirm) |
| Select Day | `1:177` | selectDay |
| Custom Day | `5:79` | selectDay (custom) |
| Select time | `1:243` | selectTime |
| Custom time | `5:147` | selectTime (custom) |
| Task summary | `123:252` | taskSummary |

## My plan

Code: `app/(app)/plan.tsx`, `PlanScreen.tsx`, `taskGroups.ts`

| Frame | Node | Step |
|-------|------|------|
| All tasks | `1:309` | List |

## Settings

Code: `app/(app)/settings/index.tsx`, `components/settings/*`

| Frame | Node | Step |
|-------|------|------|
| Settings | `1:488` | Settings |

## Preferences

Code: `app/(app)/settings/work-times.tsx`, `difficulties.tsx`, `strengths.tsx`, `onboarding/OptionRows.tsx`

| Frame | Node | Step |
|-------|------|------|
| Preferences | `122:252` | Times / Difficulties / Strengths tabs |

## Profile

Code: `app/(app)/settings/profile.tsx`, `auth/AuthFlow.tsx`

| Frame | Node | Step |
|-------|------|------|
| Profile (anonymous) | `123:413` | main (anonymous) |
| Profile (link account options) | `124:252` | linkOptions |
| Profile (sign-in options) | `124:398` | signInOptions |
| Profile (authenticated, Pro) | `123:548` | authenticated, premium |
| Profile (upgrade card) | `124:544` | authenticated, not premium |

## Insights

Code: `InsightsSheet.tsx`

| Frame | Node | Step |
|-------|------|------|
| Insights | `122:392` | Weekly stats |

## Achievements

Code: `app/(app)/settings/achievements.tsx`, `convex/achievementDefs.ts`

| Frame | Node | Step |
|-------|------|------|
| Achievements | `125:252` | Badge grid |

## Purchase

`upgrade tap → sign-in gate (anonymous only) → paywall`

Code: `app/sign-in-gate.tsx`, `app/paywall.tsx`, `app/(app)/settings/subscription.tsx`, `usePremium.tsx`

| Frame | Node | Step |
|-------|------|------|
| Sign-in gate | `125:325` | sign-in gate |

## Surveys

`invite → form → thank-you`, with a reminder banner when deferred.

Code: `components/surveys/*`, `useSurveyCampaign.ts`, `surveyPosthog.ts`

| Frame | Node | Step |
|-------|------|------|
| Survey invite | `128:252` | invite |
| Survey reminder banner | `130:267` | deferred |
| Survey form (rating) | `128:393` | rating question |
| Survey form (open text) | `128:540` | open question |
| Survey thank-you | `128:680` | reward granted |
| Survey reward toast | `130:318` | reward granted (home) |

## Home banners, toasts and loading

Code: `RatingPromptBanner.tsx`, `AiCeilingBanner.tsx`, `PointsToast.tsx`, `ExitArmingToast.tsx`, `LoadingScreen.tsx`

| Frame | Node | Step |
|-------|------|------|
| Rating prompt banner | `130:287` | rating prompt |
| AI ceiling banner | `130:300` | AI limit reached |
| Points toast | `130:315` | task completed |
| Exit-arming toast | `130:321` | Android back armed |
| Loading screen | `128:809` | app bootstrap |

## Onboarding

`welcome → difficulties → strengths → work-time → save-progress`

Code: `app/(onboarding)/*`, `OnboardingProvider.tsx`, `PreferenceStep.tsx`, `OnboardingAuth.tsx`

Parent: `193:31` on In progress; account options: `263:589`.

| Frame | Node | Step |
|-------|------|------|
| Welcome | `196:4` | welcome |
| Difficulties | `197:72` | difficulties |
| Strengths | `198:33` | strengths |
| Best times | `199:34` | work-time |
| Save progress | `259:369` | save-progress |
| Create account / options | `263:592` | save-progress (link account) |
| Sign in / options | `263:595` | welcome / save-progress (sign in) |

## Guided tour

`intro → createTask → pickDay → pickTime → moodMeter → aiPick → completeTask → celebration → saveProgress`

Code: `guidedTourFlow.ts`, `guidedTourSteps.ts`

Parent: `20:1212`

| Frame | Node | Step |
|-------|------|------|
| Tour intro card | `132:267` | intro |
| create task | `20:1100` | createTask |
| Select Day + tour tooltip | `132:695` | pickDay |
| Select time + tour tooltip | `132:764` | pickTime |
| change mood | `20:821` | moodMeter |
| get task | `20:914` | aiPick |
| complete task | `20:1007` | completeTask |
| Tour celebration | `132:281` | celebration |
| Save progress overlay | `132:425` | saveProgress |
| Save progress overlay (options) | `132:554` | saveProgress (auth options) |

## Store listing

Marketing creatives, not an in-app journey.

| Frame | Node | Step |
|-------|------|------|
| Store 1–5 | `49:79`, `49:96`, `36:405`, `36:371`, `36:327` | Store listing |
| Store collage | `42:24` | Collage |
| Icon / Icon dark | `46:24`, `46:74` | App icon |

## Shared assets

Off-canvas on Production. Clone from these instead of re-importing artwork.

| Asset | Node | Contents |
|-------|------|----------|
| Paw | `89:118` | Component, the Ionicons `paw` glyph used by the onboarding progress bar |
| ICON MASTERS (Ionicons) | `121:512` | One `ic/<name>` node per Ionicons glyph the app renders |
| MASCOT MASTERS | `127:512` | `img/dog-wave`, `dog-celebrate`, `dog-running`, `dog-star`, `ball` |

---

## In progress

Unshipped. Same flow names as Production when the frame is a draft of that journey.

Settings and its detail screens share the parent `273:590`.

| Frame | Node | Flow |
|-------|------|------|
| Onboarding UX v2 | `79:12` | Onboarding — labeled 6-paw progress (Ready already done, no Ready screen); smart defaults. Change notes `79:430`. **Awaiting approval** |
| Lullio / A softer start | `161:2` | Onboarding concept: welcome → choose a focus → try a tiny action → celebrate |
| Lullio / Editable welcome | `196:4` | Onboarding concept — welcome |
| Lullio / Difficulties | `197:72` | Onboarding — difficulties |
| Lullio / Strengths | `198:33` | Onboarding — strengths |
| Lullio / Best times | `199:34` | Onboarding — work-time |
| Lullio / Save progress | `259:369` | Onboarding — save-progress |
| Lullio / Editable home | `201:36` | Home — next task, mood, and daily progress |
| Lullio / Home / no match | `309:1032` | Home — tasks exist but none match the current energy |
| Lullio / Settings | `289:1293` | Settings — account, preferences, reminders |
| Lullio / Profile & account | `274:653` | Profile — account details, sign out, delete |
| Lullio / Subscription | `274:737` | Purchase — plan status and management |
| Lullio / Settings / Difficulties | `273:979` | Preferences — difficulties |
| Lullio / Settings / Strengths | `273:1074` | Preferences — strengths |
| Lullio / Best work times | `289:1353` | Preferences — best work times |
| Lullio / Voice languages | `279:679` | Settings — offline speech models |
| Lullio / Achievements | `279:780` | Achievements — badge grid |
| Lullio / My plan | `280:724` | My plan — list grouped by day |
| Lullio / My plan / empty | `280:906` | My plan — empty state |
| Lullio / Insights | `281:760` | Insights — weekly stats |
| Lullio / Add a task | `282:750` | Task creation — addTask |
| Lullio / Add a task / voice | `282:839` | Task creation — addTask (voice) |
| Lullio / Pick a day | `284:778` | Task creation — selectDay |
| Lullio / Pick a time | `284:865` | Task creation — selectTime |
| Lullio / Review tasks | `284:952` | Task creation — taskSummary |
| Lullio / Tour / intro | `285:820` | Guided tour — intro |
| Lullio / Tour / add a task | `285:897` | Guided tour — createTask |
| Lullio / Tour / pick a day | `285:973` | Guided tour — pickDay |
| Lullio / Tour / pick a time | `285:1078` | Guided tour — pickTime |
| Lullio / Tour / mood meter | `286:876` | Guided tour — moodMeter |
| Lullio / Tour / complete a task | `286:1030` | Guided tour — completeTask |
| Lullio / Tour / celebration | `286:1106` | Guided tour — celebration |
| Lullio / Tour / save progress | `313:1046` | Guided tour — saveProgress |
| Lullio / Tour / save progress / options | `313:1122` | Guided tour — saveProgress (auth options) |
| Sign in / username | `300:935` | Profile / Onboarding — username sign-in form |
| Create account / username | `300:956` | Profile / Onboarding — username sign-up form |
| Sign-in gate / options | `300:977` | Purchase — sign-in gate |
| Lullio / Rating prompt | `301:997` | Home banners — rating prompt |
| Lullio / Survey invite | `305:1378` | Surveys — invite |
| Lullio / Survey reminder | `301:1137` | Surveys — deferred |
| Lullio / Survey / rating question | `305:1519` | Surveys — rating question |
| Lullio / Survey / open question | `305:1660` | Surveys — open question |
| Lullio / Survey / thank you | `305:1801` | Surveys — reward granted |
| Lullio / Survey reward | `301:1277` | Surveys — reward toast (home) |
