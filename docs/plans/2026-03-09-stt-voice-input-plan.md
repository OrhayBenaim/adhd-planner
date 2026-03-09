# STT Voice Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire `expo-speech-recognition` into the existing stubbed `useSpeechRecognition` hook so RecordingSheet gets real speech-to-text with live volume data for the spectrograph.

**Architecture:** Replace the simulated stub in `useSpeechRecognition.ts` with real `ExpoSpeechRecognitionModule` calls. The hook keeps the same interface (`state`, `transcript`, `volume`, `start`, `stop`, `cancel`) so RecordingSheet needs no changes. Add the Expo plugin to `app.json`.

**Tech Stack:** `expo-speech-recognition`, `react-native-localize`, React Native

---

### Task 1: Add expo-speech-recognition plugin to app.json

**Files:**
- Modify: `apps/mobile/app.json`

**Step 1: Add plugin string to plugins array**

In `apps/mobile/app.json`, add `"expo-speech-recognition"` to the `plugins` array:

```json
"plugins": [
  "expo-router",
  "expo-notifications",
  "react-native-localize",
  "expo-speech-recognition"
]
```

**Step 2: Commit**

```bash
git add apps/mobile/app.json
git commit -m "chore: add expo-speech-recognition plugin to app.json"
```

---

### Task 2: Replace stubbed useSpeechRecognition hook with real implementation

**Files:**
- Modify: `apps/mobile/src/hooks/useSpeechRecognition.ts`

**Step 1: Replace the entire hook implementation**

Replace `apps/mobile/src/hooks/useSpeechRecognition.ts` with:

```typescript
import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { getLocales } from "react-native-localize";

type SpeechState = "idle" | "listening" | "stopped" | "error";

interface UseSpeechRecognitionResult {
  state: SpeechState;
  transcript: string;
  volume: number;
  start: (locale?: string) => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

function resolveLocale(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (Platform.OS === "android") return undefined; // auto-detect
  // iOS: use device locale
  try {
    const locales = getLocales();
    return locales[0]?.languageTag ?? "en-US";
  } catch {
    return "en-US";
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const stateRef = useRef<SpeechState>("idle");

  useSpeechRecognitionEvent("start", () => {
    stateRef.current = "listening";
    setState("listening");
  });

  useSpeechRecognitionEvent("end", () => {
    // Only go to "stopped" if we weren't cancelled (reset to idle)
    if (stateRef.current === "listening") {
      stateRef.current = "stopped";
      setState("stopped");
    }
    setVolume(0);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    setTranscript(text);
  });

  useSpeechRecognitionEvent("volumechange", (event) => {
    // event.value ranges from -2 to 10, normalize to 0-1
    const normalized = Math.max(0, Math.min(1, event.value / 10));
    setVolume(normalized);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    stateRef.current = "error";
    setState("error");
    setVolume(0);
  });

  const start = useCallback(async (locale?: string) => {
    const result =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      stateRef.current = "error";
      setState("error");
      return;
    }
    setTranscript("");
    setVolume(0);

    ExpoSpeechRecognitionModule.start({
      lang: resolveLocale(locale),
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: Platform.OS === "ios",
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, []);

  const stop = useCallback(() => {
    // stop() emits final result then fires "end"
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancel = useCallback(() => {
    stateRef.current = "idle";
    setState("idle");
    setTranscript("");
    setVolume(0);
    // abort() cancels without emitting a final result
    ExpoSpeechRecognitionModule.abort();
  }, []);

  return { state, transcript, volume, start, stop, cancel };
}
```

Key implementation notes:
- `useSpeechRecognitionEvent` hooks register at component mount; events only fire when recognition is active
- `stateRef` prevents the `end` event from overwriting state after a `cancel()` (which sets state to "idle" synchronously before `abort()` fires the end event)
- `stop()` uses `ExpoSpeechRecognitionModule.stop()` which waits for final result — the `result` event will update transcript before `end` fires
- `cancel()` uses `ExpoSpeechRecognitionModule.abort()` which cancels immediately without emitting a final result
- Volume normalized from library range (-2 to 10) to 0-1 for the spectrograph
- `continuous: false` means recognition auto-stops after ~2s silence (the `end` event fires, setting state to "stopped")
- Android auto-detection: passing `undefined` as `lang` lets the OS pick the language
- iOS: `requiresOnDeviceRecognition: true` forces on-device processing
- The `start` function accepts an optional `locale` parameter for future settings override

**Step 2: Verify RecordingSheet compatibility**

Confirm `RecordingSheet.tsx` needs no changes:
- It destructures `{ transcript, volume, start, stop, cancel }` from the hook — same interface
- `start()` is called with no args from `handleSheetChange` — works (locale defaults to auto-detect/device)
- `cancel()` is called from `handleStop` — maps to `abort()`
- `stop()` is called from `handleConfirm` — maps to `stop()` with final result

No changes needed to `RecordingSheet.tsx`.

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useSpeechRecognition.ts
git commit -m "feat: wire expo-speech-recognition into useSpeechRecognition hook"
```

---

### Task 3: Rebuild native app and verify

**Step 1: Rebuild the dev client**

The plugin change requires a native rebuild:

```bash
cd apps/mobile && npx expo prebuild --clean
```

Then build for your target platform:
- Android: `npx expo run:android`
- iOS: `npx expo run:ios`

**Step 2: Manual verification checklist**

1. Open app → tap "+" to add task → tap mic button
2. RecordingSheet opens → speech recognition starts (mic permission prompt on first use)
3. Speak a task → words appear live in the transcript area
4. Spectrograph bars animate with actual voice volume
5. Stop talking → after ~2s, recognition auto-stops, sheet stays open
6. Tap confirm (checkmark) → proceeds to SelectDaySheet with transcript as title
7. Repeat: tap mic → speak → tap cancel (X) → returns to home, transcript discarded
8. Test multi-task: say "buy groceries and call the dentist" → should go to TaskSummarySheet

**Step 3: Commit any fixes if needed**

```bash
git add -u
git commit -m "fix: address STT integration issues found during testing"
```
