# STT Voice Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire speech-to-text into the task creation flow using built-in OS recognition, with multi-task detection and a summary review screen.

**Architecture:** `@jamsch/expo-speech-recognition` wraps iOS SFSpeechRecognizer and Android SpeechRecognizer. A pluggable heuristic splitter detects multiple tasks from a single transcription. A new TaskSummarySheet lets users review/edit/delete detected tasks before batch creation. STT model selection lives in settings with download confirmation for offline Android models.

**Tech Stack:** `@jamsch/expo-speech-recognition`, `expo-av` (metering fallback), React Native Reanimated, `@gorhom/bottom-sheet`, Convex, Jest

---

### Task 1: Install and configure `@jamsch/expo-speech-recognition`

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Step 1: Install the package**

Run:
```bash
cd apps/mobile && npx expo install @jamsch/expo-speech-recognition
```

**Step 2: Add the config plugin to app.json**

In `apps/mobile/app.json`, add `@jamsch/expo-speech-recognition` to the `plugins` array and add required iOS permission strings:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "@jamsch/expo-speech-recognition",
        {
          "microphonePermission": "ADHD Planner needs access to your microphone to add tasks by voice.",
          "speechRecognitionPermission": "ADHD Planner needs speech recognition to convert your voice to text."
        }
      ]
    ]
  }
}
```

**Step 3: Verify installation**

Run:
```bash
cd apps/mobile && npx expo config --type introspect | grep -i speech
```
Expected: See `expo-speech-recognition` in the plugin output.

**Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json package-lock.json
git commit -m "feat: install and configure @jamsch/expo-speech-recognition"
```

---

### Task 2: Build the heuristic task splitter with tests

**Files:**
- Create: `apps/mobile/src/lib/taskSplitter.ts`
- Create: `apps/mobile/src/lib/__tests__/taskSplitter.test.ts`

**Step 1: Write the failing tests**

Create `apps/mobile/src/lib/__tests__/taskSplitter.test.ts`:

```typescript
import { splitTranscription } from "../taskSplitter";

describe("splitTranscription", () => {
  describe("single task detection", () => {
    it("returns a single task for simple input", () => {
      expect(splitTranscription("buy groceries", "en")).toEqual(["buy groceries"]);
    });

    it("returns a single task for short input (1-2 words)", () => {
      expect(splitTranscription("call mom", "en")).toEqual(["call mom"]);
    });

    it("does not split 'and' inside a single phrase", () => {
      expect(splitTranscription("buy salt and pepper", "en")).toEqual(["buy salt and pepper"]);
    });

    it("returns empty array for empty input", () => {
      expect(splitTranscription("", "en")).toEqual([]);
    });

    it("returns empty array for whitespace-only input", () => {
      expect(splitTranscription("   ", "en")).toEqual([]);
    });
  });

  describe("numbered items", () => {
    it("splits numbered items with dots", () => {
      expect(splitTranscription("1. buy groceries 2. call dentist 3. finish report", "en"))
        .toEqual(["buy groceries", "call dentist", "finish report"]);
    });

    it("splits numbered items with parentheses", () => {
      expect(splitTranscription("1) buy groceries 2) call dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("line breaks", () => {
    it("splits on newlines", () => {
      expect(splitTranscription("buy groceries\ncall dentist\nfinish report", "en"))
        .toEqual(["buy groceries", "call dentist", "finish report"]);
    });

    it("ignores empty lines", () => {
      expect(splitTranscription("buy groceries\n\ncall dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("conjunction splitting", () => {
    it("splits on 'and' when followed by a verb", () => {
      expect(splitTranscription("buy groceries and call the dentist", "en"))
        .toEqual(["buy groceries", "call the dentist"]);
    });

    it("splits on 'and also'", () => {
      expect(splitTranscription("buy groceries and also call the dentist", "en"))
        .toEqual(["buy groceries", "call the dentist"]);
    });

    it("splits three tasks with conjunctions", () => {
      expect(splitTranscription("buy groceries and call the dentist and finish the report", "en"))
        .toEqual(["buy groceries", "call the dentist", "finish the report"]);
    });
  });

  describe("comma splitting with verbs", () => {
    it("splits comma-separated clauses starting with verbs", () => {
      expect(splitTranscription("buy groceries, call the dentist, finish the report", "en"))
        .toEqual(["buy groceries", "call the dentist", "finish the report"]);
    });

    it("does not split comma-separated non-verb items", () => {
      expect(splitTranscription("buy milk, eggs, and bread", "en"))
        .toEqual(["buy milk, eggs, and bread"]);
    });
  });

  describe("minimum length filtering", () => {
    it("filters out fragments shorter than 3 words", () => {
      expect(splitTranscription("1. buy groceries 2. no 3. call dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("unsupported locale fallback", () => {
    it("uses universal rules for unknown locale", () => {
      expect(splitTranscription("1. task one 2. task two", "ja"))
        .toEqual(["task one", "task two"]);
    });

    it("splits on newlines for unknown locale", () => {
      expect(splitTranscription("task one\ntask two", "ja"))
        .toEqual(["task one", "task two"]);
    });

    it("returns single task when no universal signals found", () => {
      expect(splitTranscription("some task in japanese locale", "ja"))
        .toEqual(["some task in japanese locale"]);
    });
  });

  describe("trimming and cleanup", () => {
    it("trims whitespace from split tasks", () => {
      expect(splitTranscription("  buy groceries  and  call dentist  ", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd apps/mobile && npx jest src/lib/__tests__/taskSplitter.test.ts
```
Expected: FAIL — module `../taskSplitter` not found.

**Step 3: Implement the splitter**

Create `apps/mobile/src/lib/taskSplitter.ts`:

```typescript
interface LocaleSplitConfig {
  conjunctions: string[];
  commonVerbs: string[];
  numberPattern: RegExp;
}

const LOCALE_CONFIGS: Record<string, LocaleSplitConfig> = {
  en: {
    conjunctions: ["and also", "and then", "also", "then", "and"],
    commonVerbs: [
      "buy", "call", "finish", "send", "write", "read", "clean", "fix",
      "make", "do", "go", "get", "take", "pick", "drop", "set", "check",
      "review", "update", "create", "delete", "move", "start", "stop",
      "schedule", "book", "pay", "cancel", "order", "return", "submit",
      "prepare", "organize", "plan", "remind", "email", "text", "message",
      "complete", "wash", "cook", "run", "walk", "drive", "meet",
    ],
    numberPattern: /^\d+[.)]\s*/,
  },
};

const MIN_WORDS = 3;

/**
 * Split transcription text into individual task strings.
 * Uses locale-specific heuristics when available, falls back to universal rules.
 */
export function splitTranscription(text: string, locale: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Normalize locale to base language code (e.g., "en-US" → "en")
  const baseLang = locale.split("-")[0].toLowerCase();
  const config = LOCALE_CONFIGS[baseLang];

  // Try split strategies in priority order
  const numbered = splitByNumbers(trimmed);
  if (numbered.length > 1) return filterShort(numbered);

  const byLines = splitByLines(trimmed);
  if (byLines.length > 1) return filterShort(byLines);

  // Locale-specific strategies
  if (config) {
    const byConjunctions = splitByConjunctions(trimmed, config);
    if (byConjunctions.length > 1) return filterShort(byConjunctions);

    const byCommas = splitByCommasWithVerbs(trimmed, config);
    if (byCommas.length > 1) return filterShort(byCommas);
  }

  return [trimmed];
}

function splitByNumbers(text: string): string[] {
  // Match patterns like "1. task" or "1) task" embedded in text
  const parts = text.split(/\d+[.)]\s*/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function splitByLines(text: string): string[] {
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitByConjunctions(text: string, config: LocaleSplitConfig): string[] {
  const { conjunctions, commonVerbs } = config;

  // Sort conjunctions by length (longest first) to match "and also" before "and"
  const sorted = [...conjunctions].sort((a, b) => b.length - a.length);

  let parts = [text];

  for (const conj of sorted) {
    const newParts: string[] = [];
    for (const part of parts) {
      // Split on conjunction, but only if what follows starts with a verb
      const regex = new RegExp(`\\b${conj}\\b\\s+`, "gi");
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let didSplit = false;

      while ((match = regex.exec(part)) !== null) {
        const after = part.slice(match.index + match[0].length).trim();
        const firstWord = after.split(/\s+/)[0]?.toLowerCase();

        if (firstWord && commonVerbs.includes(firstWord)) {
          newParts.push(part.slice(lastIndex, match.index).trim());
          lastIndex = match.index + match[0].length;
          didSplit = true;
        }
      }

      if (didSplit) {
        newParts.push(part.slice(lastIndex).trim());
      } else {
        newParts.push(part);
      }
    }
    parts = newParts.filter(Boolean);
  }

  return parts;
}

function splitByCommasWithVerbs(text: string, config: LocaleSplitConfig): string[] {
  const parts = text.split(/,\s*/);
  if (parts.length <= 1) return [text];

  const { commonVerbs } = config;
  // Check if most parts start with a verb — if so, treat as separate tasks
  const verbStartCount = parts.filter((p) => {
    const firstWord = p.trim().split(/\s+/)[0]?.toLowerCase();
    return firstWord && commonVerbs.includes(firstWord);
  }).length;

  // Only split if majority of parts start with verbs
  if (verbStartCount >= parts.length * 0.5 && verbStartCount >= 2) {
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  return [text];
}

function filterShort(tasks: string[]): string[] {
  return tasks.filter((t) => t.split(/\s+/).length >= MIN_WORDS);
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd apps/mobile && npx jest src/lib/__tests__/taskSplitter.test.ts --verbose
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/mobile/src/lib/taskSplitter.ts apps/mobile/src/lib/__tests__/taskSplitter.test.ts
git commit -m "feat: add heuristic task splitter with English locale config"
```

---

### Task 3: Create the `useSpeechRecognition` hook

**Files:**
- Create: `apps/mobile/src/hooks/useSpeechRecognition.ts`

**Step 1: Implement the hook**

Create `apps/mobile/src/hooks/useSpeechRecognition.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STT_MODEL_KEY = "@adhd_stt_model";

export type SpeechState = "idle" | "listening" | "stopped" | "error";

interface UseSpeechRecognitionResult {
  /** Current state of recognition */
  state: SpeechState;
  /** Current transcription text (partial or final) */
  transcript: string;
  /** Current audio volume level (0-1) for spectrograph */
  volume: number;
  /** Start listening */
  start: () => Promise<void>;
  /** Stop listening (keeps transcript) */
  stop: () => void;
  /** Cancel listening (clears transcript) */
  cancel: () => void;
  /** Append more speech to existing transcript */
  append: () => Promise<void>;
  /** Error message if state is "error" */
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const accumulatedRef = useRef("");

  // Listen for partial results
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[event.resultIndex]?.transcript ?? "";
    if (event.isFinal) {
      accumulatedRef.current = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      setTranscript(accumulatedRef.current);
    } else {
      // Show accumulated + current partial
      const display = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      setTranscript(display);
    }
  });

  // Listen for volume/audio changes (for spectrograph)
  useSpeechRecognitionEvent("volumechange", (event) => {
    // Android: event.value is -2 to 10, normalize to 0-1
    // iOS: event.value is 0 to 1
    const normalized =
      Platform.OS === "android"
        ? Math.max(0, Math.min(1, (event.value + 2) / 12))
        : Math.max(0, Math.min(1, event.value));
    setVolume(normalized);
  });

  useSpeechRecognitionEvent("start", () => {
    setState("listening");
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setState("stopped");
    setVolume(0);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setState("error");
    setError(event.error);
    setVolume(0);
  });

  const getRecognitionOptions = useCallback(async () => {
    const model = await AsyncStorage.getItem(STT_MODEL_KEY);
    const requiresOnDevice = model !== null && model !== "default";
    return {
      lang: undefined, // use device locale
      interimResults: true,
      requiresOnDeviceRecognition: requiresOnDevice,
      addsPunctuation: true,
      contextualStrings: ["task", "reminder", "deadline", "tomorrow", "today"],
    };
  }, []);

  const start = useCallback(async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setState("error");
      setError("permissions_denied");
      return;
    }
    accumulatedRef.current = "";
    setTranscript("");
    setError(null);
    const options = await getRecognitionOptions();
    ExpoSpeechRecognitionModule.start(options);
  }, [getRecognitionOptions]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancel = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    accumulatedRef.current = "";
    setTranscript("");
    setState("idle");
    setVolume(0);
  }, []);

  const append = useCallback(async () => {
    // Start new recognition session, keeping accumulated text
    setError(null);
    const options = await getRecognitionOptions();
    ExpoSpeechRecognitionModule.start(options);
  }, [getRecognitionOptions]);

  return { state, transcript, volume, start, stop, cancel, append, error };
}
```

**Step 2: Verify types compile**

Run:
```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors (or only pre-existing errors unrelated to this file). Note: this won't fully resolve until the package is installed in Task 1.

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useSpeechRecognition.ts
git commit -m "feat: add useSpeechRecognition hook wrapping expo-speech-recognition"
```

---

### Task 4: Rewrite RecordingSheet with real STT and spectrograph

**Files:**
- Modify: `apps/mobile/src/components/sheets/RecordingSheet.tsx`

**Step 1: Rewrite RecordingSheet**

Replace the entire content of `apps/mobile/src/components/sheets/RecordingSheet.tsx`:

```typescript
import { forwardRef, useEffect } from "react";
import { View, Text, Alert, Linking, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { SPRING_BOUNCY } from "../../animations/springs";

interface Props {
  onStop: (transcription: string) => void;
  onClose: () => void;
}

const DOT_COUNT = 20;

function SpectroDot({ volume, index }: { volume: number; index: number }) {
  const height = useSharedValue(8);

  // Each dot responds to volume with a slight offset for visual variety
  const offset = Math.sin(index * 0.7) * 0.3;
  useEffect(() => {
    const target = 8 + (volume + offset) * 40;
    height.value = withSpring(Math.max(8, Math.min(48, target)), {
      damping: 12,
      stiffness: 180,
    });
  }, [volume]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#ffafcc",
    marginHorizontal: 2,
  }));

  return <Animated.View style={style} />;
}

export const RecordingSheet = forwardRef<BottomSheet, Props>(
  ({ onStop, onClose }, ref) => {
    const {
      state,
      transcript,
      volume,
      start,
      stop,
      cancel,
      append,
      error,
    } = useSpeechRecognition();

    const cancelScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);
    const micScale = useSharedValue(1);

    const cancelStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cancelScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));
    const micStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micScale.value }],
    }));

    // Start recognition when sheet opens
    const handleSheetChange = (index: number) => {
      if (index >= 0) {
        start();
      }
    };

    // Handle permission errors
    useEffect(() => {
      if (error === "permissions_denied") {
        Alert.alert(
          "Microphone Access Required",
          "ADHD Planner needs microphone access to add tasks by voice. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    }, [error]);

    const handleCancel = () => {
      cancel();
      onClose();
    };

    const handleConfirm = () => {
      stop();
      if (transcript.trim()) {
        onStop(transcript.trim());
      }
      // If empty, stay on sheet — do nothing
    };

    const handleMicPress = () => {
      if (state === "stopped" || state === "error") {
        append();
      }
    };

    const isListening = state === "listening";
    const showRetry =
      state === "error" && error !== "permissions_denied";

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        onClose={() => {
          cancel();
          onClose();
        }}
        onChange={handleSheetChange}
        backgroundStyle={{
          borderTopLeftRadius: 48,
          borderTopRightRadius: 48,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-[#1e2939]">
              {isListening ? "Listening..." : "Recording"}
            </Text>
            <Pressable onPress={handleCancel}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Spectrograph */}
          <View
            className="rounded-3xl overflow-hidden justify-center items-center"
            style={{
              height: 64,
              backgroundColor: "rgba(162,210,255,0.2)",
            }}
          >
            <View className="flex-row items-end" style={{ height: 48 }}>
              {Array.from({ length: DOT_COUNT }).map((_, i) => (
                <SpectroDot key={i} volume={volume} index={i} />
              ))}
            </View>
          </View>

          {/* Transcript display */}
          <View
            className="mt-4 min-h-[60px] rounded-2xl px-4 py-3"
            style={{ backgroundColor: "rgba(162,210,255,0.1)" }}
          >
            <Text
              className="text-base text-[#1e2939]"
              style={{ opacity: transcript ? 1 : 0.4 }}
            >
              {transcript || "Start speaking..."}
            </Text>
          </View>

          {/* Error / retry message */}
          {showRetry && (
            <Text className="text-sm text-[#f87171] mt-2 text-center">
              Couldn't catch that. Tap the mic to try again.
            </Text>
          )}

          {/* Buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-4">
            {/* Cancel */}
            <Animated.View style={cancelStyle}>
              <Pressable
                onPress={handleCancel}
                onPressIn={() => {
                  cancelScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  cancelScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="w-14 h-14 rounded-full items-center justify-center bg-[#ffc8dd]"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </Animated.View>

            {/* Mic (append/retry) — shown when stopped */}
            {!isListening && (
              <Animated.View style={micStyle}>
                <Pressable
                  onPress={handleMicPress}
                  onPressIn={() => {
                    micScale.value = withSpring(0.92, SPRING_BOUNCY);
                  }}
                  onPressOut={() => {
                    micScale.value = withSpring(1, SPRING_BOUNCY);
                  }}
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#a2d2ff" }}
                >
                  <Ionicons name="mic" size={24} color="#fff" />
                </Pressable>
              </Animated.View>
            )}

            {/* Confirm */}
            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => {
                  confirmScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  confirmScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "#bde0fe",
                  opacity: transcript.trim() ? 1 : 0.5,
                }}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Verify types compile**

Run:
```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors related to RecordingSheet.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/RecordingSheet.tsx
git commit -m "feat: rewrite RecordingSheet with real STT and spectrograph"
```

---

### Task 5: Create TaskSummarySheet component

**Files:**
- Create: `apps/mobile/src/components/sheets/TaskSummarySheet.tsx`

**Step 1: Implement the component**

Create `apps/mobile/src/components/sheets/TaskSummarySheet.tsx`:

```typescript
import { forwardRef, useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

export interface PendingTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
}

interface Props {
  tasks: PendingTask[];
  onTasksChange: (tasks: PendingTask[]) => void;
  onCreateAll: (tasks: PendingTask[]) => void;
  onEditDateTime: (taskId: string, field: "dueDate" | "dueTime") => void;
  onClose: () => void;
}

function TaskCard({
  task,
  onTitleChange,
  onDelete,
  onEditDate,
  onEditTime,
}: {
  task: PendingTask;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onEditDate: () => void;
  onEditTime: () => void;
}) {
  return (
    <View className="bg-[#f5f7fa] rounded-2xl px-4 py-3 mb-3">
      <View className="flex-row items-start gap-3">
        {/* Editable title */}
        <View className="flex-1">
          <TextInput
            className="text-base text-[#1e2939] font-medium p-0"
            value={task.title}
            onChangeText={onTitleChange}
            multiline
          />
          {/* Date/time pills */}
          <View className="flex-row gap-2 mt-2">
            <Pressable
              onPress={onEditDate}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(162,210,255,0.3)" }}
            >
              <Text className="text-xs text-[#1e2939]">{task.dueDate}</Text>
            </Pressable>
            <Pressable
              onPress={onEditTime}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,200,221,0.3)" }}
            >
              <Text className="text-xs text-[#1e2939]">{task.dueTime}</Text>
            </Pressable>
          </View>
        </View>
        {/* Delete button */}
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(248,113,113,0.15)" }}
        >
          <Ionicons name="close" size={16} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
}

export const TaskSummarySheet = forwardRef<BottomSheet, Props>(
  ({ tasks, onTasksChange, onCreateAll, onEditDateTime, onClose }, ref) => {
    const createScale = useSharedValue(1);
    const createStyle = useAnimatedStyle(() => ({
      transform: [{ scale: createScale.value }],
    }));

    const updateTitle = useCallback(
      (id: string, title: string) => {
        onTasksChange(
          tasks.map((t) => (t.id === id ? { ...t, title } : t))
        );
      },
      [tasks, onTasksChange]
    );

    const removeTask = useCallback(
      (id: string) => {
        const updated = tasks.filter((t) => t.id !== id);
        if (updated.length === 0) {
          onClose();
        } else {
          onTasksChange(updated);
        }
      },
      [tasks, onTasksChange, onClose]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%", "85%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{
          borderTopLeftRadius: 48,
          borderTopRightRadius: 48,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6 flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-[#1e2939]">
              We detected {tasks.length} tasks
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Task list */}
          <BottomSheetScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTitleChange={(title) => updateTitle(task.id, title)}
                onDelete={() => removeTask(task.id)}
                onEditDate={() => onEditDateTime(task.id, "dueDate")}
                onEditTime={() => onEditDateTime(task.id, "dueTime")}
              />
            ))}
          </BottomSheetScrollView>

          {/* Bottom buttons */}
          <View className="flex-row gap-3 pb-6 pt-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-4 rounded-full items-center"
              style={{ backgroundColor: "#f5f7fa" }}
            >
              <Text className="text-[#6a7282] font-medium">Cancel</Text>
            </Pressable>

            <Animated.View style={[createStyle, { flex: 1 }]}>
              <Pressable
                onPress={() => onCreateAll(tasks)}
                onPressIn={() => {
                  createScale.value = withSpring(0.95, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  createScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="py-4 rounded-full items-center"
                style={{ backgroundColor: "#a2d2ff" }}
              >
                <Text className="text-white font-semibold">
                  Create All ({tasks.length})
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Verify types compile**

Run:
```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors related to TaskSummarySheet.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/TaskSummarySheet.tsx
git commit -m "feat: add TaskSummarySheet for multi-task review and batch creation"
```

---

### Task 6: Wire STT flow into SheetManager and HomeProvider

**Files:**
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Update ActiveSheet type in HomeProvider**

Add `"taskSummary"` to the `ActiveSheet` union in `apps/mobile/src/components/home/HomeProvider.tsx:11-18`:

```typescript
export type ActiveSheet =
  | "none"
  | "addTask"
  | "recording"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "taskSummary";
```

**Step 2: Update SheetManager to handle multi-task flow**

Replace the entire content of `apps/mobile/src/components/home/SheetManager.tsx`:

```typescript
// apps/mobile/src/components/home/SheetManager.tsx
import { useRef, useState, useCallback, useEffect, type RefObject } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { TaskSummarySheet, type PendingTask } from "../sheets/TaskSummarySheet";
import { useHome, type ActiveSheet } from "./HomeProvider";
import { daySelectionToDate, timeSelectionToTime } from "../../lib/dateTimeConvert";
import { splitTranscription } from "../../lib/taskSplitter";
import { getLocales } from "react-native-localize";

let nextId = 0;
function genId() {
  return `pending-${++nextId}`;
}

function getDeviceLocale(): string {
  try {
    const locales = getLocales();
    return locales[0]?.languageCode ?? "en";
  } catch {
    return "en";
  }
}

export function SheetManager() {
  const {
    tasks,
    settings,
    adminAiEnabled,
    createTask,
    deleteTask,
    updateSetting,
    openSheet,
    closeSheet,
    registerSheet,
  } = useHome();

  // Sheet refs
  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);

  // Register refs with HomeProvider so openSheet/closeSheet work
  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
  }, [registerSheet]);

  // Queue for chaining sheets (close one → open next)
  const nextSheetRef = useRef<ActiveSheet | null>(null);

  const onSheetClosed = useCallback(
    (sheetRef: RefObject<BottomSheet | null>) => () => {
      const next = nextSheetRef.current;
      nextSheetRef.current = null;
      sheetRef.current?.close();
      if (next) {
        openSheet(next);
      }
    },
    [openSheet]
  );

  // === Single-task flow state ===
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  // === Multi-task flow state ===
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"dueDate" | "dueTime" | null>(null);

  // When recording produces text, decide single vs multi flow
  const handleRecordingStop = useCallback(
    (text: string) => {
      if (!text.trim()) {
        nextSheetRef.current = null;
        recordingSheetRef.current?.close();
        return;
      }

      const locale = getDeviceLocale();
      const splitTasks = splitTranscription(text, locale);

      if (splitTasks.length <= 1) {
        // Single task — existing flow
        setPendingTaskTitle(splitTasks[0] || text);
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      } else {
        // Multiple tasks — go to day/time selection first, then summary
        const pending: PendingTask[] = splitTasks.map((title) => ({
          id: genId(),
          title,
          dueDate: "",
          dueTime: "",
        }));
        setPendingTasks(pending);
        // Go to day selection (will apply to all tasks)
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      }
    },
    []
  );

  const handleTaskConfirmed = useCallback((title: string) => {
    setPendingTaskTitle(title);
    nextSheetRef.current = "selectDay";
    addSheetRef.current?.close();
  }, []);

  const handleDaySelected = useCallback((day: string) => {
    if (day === "custom") {
      setShowCustomDay(true);
      return;
    }
    const dateStr = daySelectionToDate(day);
    setShowCustomDay(false);

    if (editingTaskId) {
      // Editing a specific task in summary
      setPendingTasks((prev) =>
        prev.map((t) => (t.id === editingTaskId ? { ...t, dueDate: dateStr } : t))
      );
      setEditingTaskId(null);
      setEditingField(null);
      nextSheetRef.current = "taskSummary";
      daySheetRef.current?.close();
    } else if (pendingTasks.length > 0) {
      // Multi-task: apply same date to all, go to time
      setPendingTasks((prev) => prev.map((t) => ({ ...t, dueDate: dateStr })));
      setSelectedDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    } else {
      // Single task flow
      setSelectedDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    }
  }, [editingTaskId, pendingTasks.length]);

  const handleTimeSelected = useCallback(
    async (time: string) => {
      if (time === "custom") {
        setShowCustomTime(true);
        return;
      }
      const timeStr = timeSelectionToTime(time);
      setShowCustomTime(false);

      if (editingTaskId) {
        // Editing a specific task in summary
        setPendingTasks((prev) =>
          prev.map((t) => (t.id === editingTaskId ? { ...t, dueTime: timeStr } : t))
        );
        setEditingTaskId(null);
        setEditingField(null);
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else if (pendingTasks.length > 0) {
        // Multi-task: apply same time to all, go to summary
        setPendingTasks((prev) => prev.map((t) => ({ ...t, dueTime: timeStr })));
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else {
        // Single task flow — create immediately
        closeSheet();
        await createTask({
          title: pendingTaskTitle,
          dueDate: selectedDay,
          dueTime: timeStr,
        });
        setPendingTaskTitle("");
        setSelectedDay("");
      }
    },
    [closeSheet, createTask, pendingTaskTitle, selectedDay, editingTaskId, pendingTasks.length]
  );

  const handleEditDateTime = useCallback(
    (taskId: string, field: "dueDate" | "dueTime") => {
      setEditingTaskId(taskId);
      setEditingField(field);
      nextSheetRef.current = field === "dueDate" ? "selectDay" : "selectTime";
      taskSummaryRef.current?.close();
    },
    []
  );

  const handleCreateAll = useCallback(
    async (tasksToCreate: PendingTask[]) => {
      closeSheet();
      for (const task of tasksToCreate) {
        await createTask({
          title: task.title,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
        });
      }
      setPendingTasks([]);
    },
    [closeSheet, createTask]
  );

  const handleSummaryClose = useCallback(() => {
    setPendingTasks([]);
    setEditingTaskId(null);
    setEditingField(null);
    closeSheet();
  }, [closeSheet]);

  return (
    <>
      <AddTaskSheet
        ref={addSheetRef}
        onConfirm={handleTaskConfirmed}
        onMicPress={() => {
          nextSheetRef.current = "recording";
          addSheetRef.current?.close();
        }}
        onClose={onSheetClosed(addSheetRef)}
      />
      <RecordingSheet
        ref={recordingSheetRef}
        onStop={handleRecordingStop}
        onClose={onSheetClosed(recordingSheetRef)}
      />
      <SelectDaySheet
        ref={daySheetRef}
        onSelect={handleDaySelected}
        onClose={onSheetClosed(daySheetRef)}
        customValue={customDay}
        onCustomChange={setCustomDay}
        showCustomInput={showCustomDay}
      />
      <SelectTimeSheet
        ref={timeSheetRef}
        onSelect={handleTimeSelected}
        onClose={closeSheet}
        customValue={customTime}
        onCustomChange={setCustomTime}
        showCustomInput={showCustomTime}
      />
      <TaskSummarySheet
        ref={taskSummaryRef}
        tasks={pendingTasks}
        onTasksChange={setPendingTasks}
        onCreateAll={handleCreateAll}
        onEditDateTime={handleEditDateTime}
        onClose={handleSummaryClose}
      />
      <AllTasksSheet
        ref={allTasksSheetRef}
        tasks={tasks}
        onEdit={() => {}}
        onDelete={(id) => deleteTask(id)}
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        settings={settings}
        onUpdate={updateSetting}
        onClose={closeSheet}
        adminAiEnabled={adminAiEnabled}
      />
    </>
  );
}
```

**Step 3: Install react-native-localize (for getLocales)**

Run:
```bash
cd apps/mobile && npx expo install react-native-localize
```

**Step 4: Verify types compile**

Run:
```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors related to SheetManager or HomeProvider.

**Step 5: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx apps/mobile/src/components/home/SheetManager.tsx apps/mobile/package.json package-lock.json
git commit -m "feat: wire STT flow with multi-task splitting into SheetManager"
```

---

### Task 7: Add STT model settings to SettingsSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SettingsSheet.tsx`
- Modify: `apps/mobile/src/hooks/useSettings.ts`

**Step 1: Add sttModel to useSettings hook**

In `apps/mobile/src/hooks/useSettings.ts`, add the `sttModel` setting. The STT model is stored locally in AsyncStorage (not in Convex — it's a device-specific preference).

Add to the `Settings` interface:
```typescript
export interface Settings {
  notifications: boolean;
  soundEffects: boolean;
  smartScheduling: boolean;
  sttModel: string;
}
```

Add to `localSettings` state:
```typescript
const [localSettings, setLocalSettings] = useState({
  notificationsDesired: true,
  notificationsGranted: false,
  soundEffects: true,
  sttModel: "default",
});
```

Update the `settings` object:
```typescript
const settings: Settings = {
  notifications: localSettings.notificationsDesired && localSettings.notificationsGranted,
  soundEffects: localSettings.soundEffects,
  smartScheduling: adminAiEnabled && userAiEnabled,
  sttModel: localSettings.sttModel,
};
```

Add the `sttModel` case to `updateSetting`:
```typescript
} else if (key === "sttModel") {
  setLocalSettings((prev) => {
    const next = { ...prev, sttModel: value as string };
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    AsyncStorage.setItem("@adhd_stt_model", value as string);
    return next;
  });
}
```

Also update the `useEffect` loader to read `sttModel`:
```typescript
sttModel: stored.sttModel ?? "default",
```

**Step 2: Add STT model section to SettingsSheet**

In `apps/mobile/src/components/sheets/SettingsSheet.tsx`, add a new section below the existing setting rows. Add the needed imports and state:

```typescript
import { useState, useEffect } from "react";
import { View, Text, Switch, Platform, Alert, ActivityIndicator } from "react-native";
import { ExpoSpeechRecognitionModule } from "@jamsch/expo-speech-recognition";
```

Add a `SttModelSection` component inside the file:

```typescript
function SttModelSection({
  currentModel,
  onModelChange,
}: {
  currentModel: string;
  onModelChange: (model: string) => void;
}) {
  const [locales, setLocales] = useState<{ installed: string[]; available: string[] }>({
    installed: [],
    available: [],
  });
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackageName:
          "com.google.android.googlequicksearchbox",
      }).then((result) => {
        setLocales({
          installed: result.installedLocales ?? [],
          available: result.supportedLocales ?? [],
        });
      }).catch(() => {});
    }
  }, []);

  const handleSelectModel = (model: string) => {
    if (model === "default" || locales.installed.includes(model)) {
      onModelChange(model);
      setExpanded(false);
    } else {
      // Need to download first
      Alert.alert(
        "Download Offline Model",
        `Download the offline speech model for "${model}"? This allows voice input without internet.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Download",
            onPress: async () => {
              setDownloading(true);
              try {
                await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
                  locale: model,
                });
                onModelChange(model);
              } catch {
                Alert.alert("Download Failed", "Could not download the model. Please try again.");
              } finally {
                setDownloading(false);
              }
            },
          },
        ]
      );
    }
  };

  const displayName = currentModel === "default" ? "System Default" : currentModel;

  return (
    <View className="mb-3">
      <View className="bg-[#f5f7fa] rounded-3xl px-4 py-4">
        <Pressable onPress={() => setExpanded(!expanded)}>
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "#cdb4db" }}
            >
              <Ionicons name="mic-outline" size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#1e2939]">Voice Model</Text>
              <Text className="text-xs text-[#6a7282]">{displayName}</Text>
            </View>
            {downloading ? (
              <ActivityIndicator size="small" color="#a2d2ff" />
            ) : (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6a7282"
              />
            )}
          </View>
        </Pressable>

        {expanded && Platform.OS === "android" && (
          <View className="mt-3 pt-3 border-t border-[#e5e7eb]">
            <Pressable
              onPress={() => handleSelectModel("default")}
              className="py-2 px-3 rounded-xl mb-1"
              style={{
                backgroundColor: currentModel === "default" ? "rgba(162,210,255,0.3)" : "transparent",
              }}
            >
              <Text className="text-sm text-[#1e2939]">System Default</Text>
              <Text className="text-xs text-[#6a7282]">Uses network when available</Text>
            </Pressable>

            {locales.available.slice(0, 10).map((locale) => {
              const isInstalled = locales.installed.includes(locale);
              const isSelected = currentModel === locale;
              return (
                <Pressable
                  key={locale}
                  onPress={() => handleSelectModel(locale)}
                  className="py-2 px-3 rounded-xl mb-1"
                  style={{
                    backgroundColor: isSelected ? "rgba(162,210,255,0.3)" : "transparent",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-[#1e2939]">{locale}</Text>
                      <Text className="text-xs text-[#6a7282]">
                        {isInstalled ? "Downloaded" : "Tap to download"}
                      </Text>
                    </View>
                    {isInstalled && (
                      <Ionicons name="checkmark-circle" size={18} color="#a2d2ff" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {expanded && Platform.OS === "ios" && (
          <View className="mt-3 pt-3 border-t border-[#e5e7eb]">
            <Text className="text-xs text-[#6a7282] px-3">
              iOS uses the built-in on-device speech model. No additional downloads needed.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
```

Add the `SttModelSection` to the SettingsSheet JSX, after the existing `SettingRow` components:

```typescript
<SttModelSection
  currentModel={settings.sttModel}
  onModelChange={(model) => onUpdate("sttModel", model)}
/>
```

**Step 3: Verify types compile**

Run:
```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useSettings.ts apps/mobile/src/components/sheets/SettingsSheet.tsx
git commit -m "feat: add STT model selection to settings with offline download support"
```

---

### Task 8: Add userSettings schema fields for STT (Convex)

**Files:**
- Modify: `apps/convex/convex/schema.ts`
- Modify: `apps/convex/convex/settings.ts`

**Step 1: Add sttModel and sttLocale to schema**

In `apps/convex/convex/schema.ts`, update the `userSettings` table:

```typescript
userSettings: defineTable({
  userId: v.string(),
  aiEnabled: v.boolean(),
  userAiEnabled: v.optional(v.boolean()),
  sttModel: v.optional(v.string()),
  sttLocale: v.optional(v.string()),
}).index("by_user", ["userId"]),
```

**Step 2: Add mutation for STT settings**

In `apps/convex/convex/settings.ts`, add a new mutation:

```typescript
export const setSttSettings = mutation({
  args: {
    sttModel: v.optional(v.string()),
    sttLocale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch: Record<string, string | undefined> = {};
    if (args.sttModel !== undefined) patch.sttModel = args.sttModel;
    if (args.sttLocale !== undefined) patch.sttLocale = args.sttLocale;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        aiEnabled: true,
        ...patch,
      });
    }
  },
});
```

**Step 3: Verify Convex types generate**

Run:
```bash
cd apps/convex && npx convex codegen
```
Expected: Schema and API types regenerate without errors.

**Step 4: Commit**

```bash
git add apps/convex/convex/schema.ts apps/convex/convex/settings.ts
git commit -m "feat: add sttModel and sttLocale fields to userSettings schema"
```

---

### Task 9: Manual end-to-end testing

This task verifies the full STT flow on a real device (required — speech recognition doesn't work in simulators reliably).

**Step 1: Rebuild the dev client**

The `@jamsch/expo-speech-recognition` config plugin requires a new native build:

```bash
cd apps/mobile && npx expo prebuild --clean
npx expo run:android  # or npx expo run:ios
```

**Step 2: Test single-task voice input**

1. Open app → tap "+" → tap mic button
2. Say "buy groceries"
3. Verify: spectrograph animates, text appears in real-time
4. Tap confirm → SelectDaySheet appears → pick a day → SelectTimeSheet → pick time → task created
5. Verify task appears in home screen

**Step 3: Test multi-task voice input**

1. Tap "+" → tap mic
2. Say "buy groceries and call the dentist and finish the report"
3. Tap confirm → SelectDaySheet appears → pick a day → SelectTimeSheet → pick time
4. Verify: TaskSummarySheet shows 3 tasks, all with same date/time
5. Edit one task's title, change another's date pill, delete one
6. Tap "Create All" → verify 2 tasks created

**Step 4: Test settings model selection (Android only)**

1. Open Settings → scroll to "Voice Model"
2. Tap to expand → see "System Default" + available locales
3. Tap a locale → confirm download dialog → verify model downloads
4. Close settings → record a task → verify it uses on-device recognition

**Step 5: Test error states**

1. Deny mic permission → verify alert with settings link
2. Record with no speech → verify "Couldn't catch that" message
3. Record and cancel → verify no task created, clean state

**Step 6: Commit any fixes found during testing**

```bash
git add -u
git commit -m "fix: address issues found during STT end-to-end testing"
```
