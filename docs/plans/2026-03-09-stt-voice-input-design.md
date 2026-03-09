# STT Voice Input Design

## Overview

Wire speech-to-text into the ADHD planner's task creation flow. Users can speak tasks via the existing RecordingSheet, with support for multi-task detection and a review summary before creation.

## Decisions

- **STT library:** `expo-speech-recognition` — wraps iOS SFSpeechRecognizer and Android SpeechRecognizer
- **Default model:** OS built-in (zero download)
- **Languages:** Android uses auto-detection; iOS and Android fallback use device locale
- **On-device recognition:** Required on iOS (`requiresOnDeviceRecognition: Platform.OS === "ios"`)
- **Volume events:** `volumeChangeEventOptions: { enabled: true, intervalMillis: 100 }` for spectrograph
- **Multi-task splitting:** Heuristic-based, pluggable per-locale, future AI swap path
- **Multi-task date/time:** AI assigns defaults if available, fallback to single date/time selection applied to all, always shows summary for editing
- **Offline:** Critical — all STT runs on-device (iOS always, Android when offline model downloaded)
- **First pass scope:** No settings UI for language/model selection — just wire the hook. Settings override supported in code for later.

## Section 1: STT Engine & Language Resolution

**Library:** `expo-speech-recognition`

Default behavior uses the OS speech recognizer (iOS SFSpeechRecognizer, Android SpeechRecognizer). Works immediately with no downloads.

### Language Resolution (in `useSpeechRecognition.start()`)

Priority order:
1. Explicit `locale` parameter (future settings override via `sttLocale`)
2. Android: `undefined` (auto-detection — library/OS handles this natively)
3. iOS / Android fallback: `getLocales()[0].languageTag` (e.g. `"en-US"`)

### Key STT Options

```typescript
ExpoSpeechRecognitionModule.start({
  lang: resolvedLocale,
  interimResults: true,
  continuous: false,
  requiresOnDeviceRecognition: Platform.OS === "ios",
  volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
})
```

### Future: Settings UI (Not This Pass)

- Voice Recognition Model selection in SettingsSheet
- Language override (`sttLocale`) in SettingsSheet
- Android offline model downloads
- Hook already accepts optional `locale` param to support this

## Section 2: Recording Flow & RecordingSheet

### Microphone Permissions

- Request on first `start()` call via `ExpoSpeechRecognitionModule.requestPermissionsAsync()`
- If denied: set state to "error"

### RecordingSheet Behavior

Replaces the current stubbed hook:

1. User taps mic in AddTaskSheet → RecordingSheet opens
2. Speech recognition starts immediately (sheet `onChange` triggers `start()`)
3. Real-time partial results shown as text — user sees words appearing live
4. Live spectrograph animation: pink bars driven by `volumechange` events from the library
5. Cancel (X) → stops recognition, discards text, resets flow
6. Confirm (checkmark) → stops recognition, passes final transcription to task splitter
7. Auto-stop on silence — `end` event fires, state becomes "stopped", sheet stays open for review. User must click confirm to proceed.

### Events Wired in Hook

- `result` → updates transcript (uses final result when `isFinal`, interim otherwise)
- `volumechange` → updates volume (normalized 0-1 for spectrograph)
- `end` → sets state to "stopped"
- `error` → sets state to "error"

### After Transcription

- Single task detected → existing wizard (SelectDaySheet → SelectTimeSheet → create)
- Multiple tasks detected → TaskSummarySheet

## Section 3: Multi-Task Detection & Splitting

### Pluggable Splitter Architecture

```
splitTranscription(text, locale) → string[]
```

Interface-based `TaskSplitter` with a `split(text, locale)` method.

### HeuristicSplitter (Default)

Per-locale config object:

```typescript
interface LocaleSplitConfig {
  locale: string;
  conjunctions: string[];       // ["and", "and also", "also"]
  verbPatterns?: RegExp;        // common task-starting verbs
  numberPatterns: RegExp;       // /^\d+[\.\)]/
}
```

**Split signals (priority order):**
1. Numbered items: "1. buy groceries 2. call dentist"
2. Line breaks
3. Conjunctions with context: "buy groceries and call the dentist"
4. Comma-separated with verb detection

**False-split prevention:**
- Don't split "and" inside single phrases (e.g., "buy salt and pepper")
- Verb detection — new clause starting with a verb signals a new task
- Minimum 3-word threshold per task to avoid fragments

### Language Extensibility

- Adding a language = adding a new `LocaleSplitConfig` object
- No locale config found → fall back to universal rules (numbers, line breaks only)
- Future: swap entire splitter for AI-based splitting (same interface, sends to OpenRouter or on-device model)

### Start with English config only.

## Section 4: TaskSummarySheet

### When Shown

After transcription produces 2+ tasks.

### Layout

- Header: "We detected X tasks"
- Scrollable list of task cards:
  - Task title (editable — tap to inline edit)
  - Day/time pills showing assigned date & time
  - Tap day or time pill → mini picker for that task
  - Visible delete (X) button on each card — no hidden gestures
- Bottom buttons: "Cancel" and "Create All"

### Date/Time Assignment

- **AI available:** AI assigns reasonable defaults per task
- **AI unavailable:** User goes through SelectDaySheet + SelectTimeSheet once → same date/time applied to all → summary shown for individual adjustments
- Summary is always shown before creating

### Create All

- Creates tasks sequentially via existing `tasks.create()` mutation
- Each triggers AI difficulty scoring independently
- Sheet closes, returns to home screen

### Single Task Flow (Unchanged)

Splitter returns 1 task → skip TaskSummarySheet → existing wizard

## Section 5: Data & Backend Changes

### Schema Changes

None. Tasks are created individually via existing `tasks.create()` mutation.

### New userSettings Fields (Future)

- `sttModel: string` — model identifier. Default: `"default"`
- `sttLocale?: string` — optional language override (defaults to device locale)

### All STT Logic is Client-Side

No new Convex functions needed. Task creation, AI scoring, and scheduler work as-is.

## Section 6: Permissions & Error Handling

### Permissions

- **Microphone:** requested on first `start()`, cached
- **Speech recognition (iOS):** separate permission, handled by library
- Denied → state set to "error"

### Error States

- Recognition fails / empty → "Couldn't catch that, try again" in RecordingSheet
- No internet + no offline model (Android) → suggest downloading offline model from settings

### Edge Cases

- Empty transcription confirmed → nothing happens, stay on RecordingSheet
- Very short input (1-2 words) → single task, no splitting
- No speech detected after timeout → prompt to tap mic to retry

## Section 7: Plugin Configuration

### app.json

Add `"expo-speech-recognition"` to the plugins array:

```json
"plugins": [
  "expo-router",
  "expo-notifications",
  "react-native-localize",
  "expo-speech-recognition"
]
```
