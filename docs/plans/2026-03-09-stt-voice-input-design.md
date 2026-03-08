# STT Voice Input Design

## Overview

Wire speech-to-text into the ADHD planner's task creation flow. Users can speak tasks via the existing RecordingSheet, with support for multi-task detection and a review summary before creation.

## Decisions

- **STT library:** `@jamsch/expo-speech-recognition` — wraps iOS SFSpeechRecognizer and Android SpeechRecognizer
- **Default model:** OS built-in (zero download)
- **Model upgrades:** Downloadable offline models available in settings (Android). iOS uses built-in on-device model only.
- **Multi-task splitting:** Heuristic-based, pluggable per-locale, future AI swap path
- **Multi-task date/time:** AI assigns defaults if available, fallback to single date/time selection applied to all, always shows summary for editing
- **Languages:** Multi-language via OS locale support
- **Offline:** Critical — all STT runs on-device

## Section 1: STT Engine & Model Management

**Library:** `@jamsch/expo-speech-recognition`

Default behavior uses the OS speech recognizer (iOS SFSpeechRecognizer, Android SpeechRecognizer). Works immediately with no downloads.

### Settings UI — Voice Recognition Model

- New section in SettingsSheet: "Voice Recognition Model"
- Dropdown shows current model and available options:
  - `Default` — pre-installed, no download
  - Per-locale offline models (Android only) — show name and estimated size
- On iOS: shows "System (on-device)" with no download options
- On Android: selecting an offline model shows a confirmation dialog with model name + size. User taps "Download" to trigger `androidTriggerOfflineModelDownload(locale)`. Progress indicator shown. Once downloaded, future STT calls use `requiresOnDeviceRecognition: true`.
- Selected model saved to `userSettings.sttModel` (string — stores whatever identifier the library provides, default is `"default"`)

### Locale

- Auto-detect from device locale
- Optional language override in settings (`userSettings.sttLocale`)

## Section 2: Recording Flow & RecordingSheet

### Microphone Permissions

- Request on first mic button tap via `ExpoSpeechRecognitionModule.requestPermissionsAsync()`
- If denied: alert explaining why mic is needed + link to system settings

### RecordingSheet Behavior

Replaces the current UI-only placeholder:

1. User taps mic in AddTaskSheet → RecordingSheet opens
2. Speech recognition starts immediately (`ExpoSpeechRecognitionModule.start()`)
3. Real-time partial results shown as text — user sees words appearing live
4. Live spectrograph animation: pink dots driven by actual mic audio amplitude levels (via recording audio data from the library, or `expo-av` metering as fallback)
5. Cancel (X) → stops recognition, discards text, returns to AddTaskSheet
6. Confirm (checkmark) → stops recognition, passes final transcription forward
7. Auto-stop after ~2s silence — sheet stays open, user reviews and confirms or taps mic to append

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

### New userSettings Fields

- `sttModel: string` — model identifier as provided by library. Default: `"default"`
- `sttLocale?: string` — optional language override (defaults to device locale)

### All STT Logic is Client-Side

No new Convex functions needed. Task creation, AI scoring, and scheduler work as-is.

## Section 6: Permissions & Error Handling

### Permissions

- **Microphone:** requested on first mic tap, cached
- **Speech recognition (iOS):** separate permission, handled by library
- Denied → alert with system settings link

### Error States

- Recognition fails / empty → "Couldn't catch that, try again" in RecordingSheet
- No internet + no offline model (Android) → suggest downloading offline model from settings
- Offline model download fails → error message, retry from settings

### Edge Cases

- Empty transcription confirmed → nothing happens, stay on RecordingSheet
- Very short input (1-2 words) → single task, no splitting
- No speech detected after timeout → prompt to tap mic to retry
