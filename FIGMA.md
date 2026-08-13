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

## All tasks

Code: `AllTasksSheet.tsx`

| Frame | Node | Step |
|-------|------|------|
| All tasks | `1:309` | List |

## Settings

Code: `SettingsSheet.tsx`

| Frame | Node | Step |
|-------|------|------|
| Settings | `1:488` | Settings |

## Preferences

Code: `PreferencesSheet.tsx`, `SegmentedControl.tsx`, `ChipGrid.tsx`

| Frame | Node | Step |
|-------|------|------|
| Preferences | `122:252` | Times / Difficulties / Strengths tabs |

## Profile

Code: `ProfileSheet.tsx`, `sheets/profile/*`, `auth/AuthFlow.tsx`

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

Code: `app/achievements.tsx`, `convex/achievementDefs.ts`

| Frame | Node | Step |
|-------|------|------|
| Achievements | `125:252` | Badge grid |

## Purchase

`upgrade tap → sign-in gate (anonymous only) → paywall`

Code: `app/sign-in-gate.tsx`, `app/paywall.tsx`, `usePremium.tsx`

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

`welcome → work-time → difficulties → strengths → notifications`

Code: `app/(onboarding)/*`, `OnboardingProvider.tsx`

Parent: `13:767`

| Frame | Node | Step |
|-------|------|------|
| Onboarding - name | `12:367` | welcome |
| Onboarding time / selected | `12:395`, `12:432` | work-time |
| Onboarding whats difficult / selected | `12:469`, `12:516` | difficulties |
| Onboarding whats easy / selected | `12:569`, `12:616` | strengths |
| Onboarding notification | `12:669` | notifications |
| Onboarding sign-in / options | `12:695`, `12:720` | welcome (auth) |

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

| Frame | Node | Flow |
|-------|------|------|
| Onboarding UX v2 | `79:12` | Onboarding — labeled 6-paw progress (Ready already done, no Ready screen); smart defaults. Change notes `79:430`. **Awaiting approval** |
