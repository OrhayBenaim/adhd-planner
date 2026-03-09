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
  requestPermissions: () => Promise<boolean>;
  start: (locale?: string) => void;
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
    // event.value ranges from -2 to 10, normalize to 0-1 with dampening
    const raw = Math.max(0, Math.min(1, (event.value + 2) / 12));
    const normalized = raw * 0.6;
    setVolume(normalized);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    stateRef.current = "error";
    setState("error");
    setVolume(0);
  });

  const requestPermissions = useCallback(async () => {
    const result =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  }, []);

  const start = useCallback((locale?: string) => {
    setTranscript("");
    setVolume(0);

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
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

  return { state, transcript, volume, requestPermissions, start, stop, cancel };
}
