import { useState, useCallback, useRef } from "react";
import * as Sentry from "@sentry/react-native";
import {
  ExpoSpeechRecognitionErrorCode,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

type SpeechState = "idle" | "listening" | "stopped" | "error";

interface UseSpeechRecognitionResult {
  state: SpeechState;
  transcript: string;
  volume: number;
  error: ExpoSpeechRecognitionErrorCode | null
  requestPermissions: () => Promise<boolean>;
  start: (locale?: string) => void;
  stop: () => void;
  cancel: () => void;
}

export function useSpeechRecognition(onError?: (code: ExpoSpeechRecognitionErrorCode) => void): UseSpeechRecognitionResult {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<ExpoSpeechRecognitionErrorCode | null>(
    null,
  );
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
    Sentry.captureMessage(`Speech recognition error: ${event.error} – ${event.message}`, "warning");
    stateRef.current = "error";
    setState("error");
    setVolume(0);
    setError(event.error);
    onError?.(event.error);
    if(event.error !=='aborted'){
    cancel();

    }
  });

  const requestPermissions = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  }, []);

  const start = useCallback(() => {
    setTranscript("");
    setVolume(0);
    setError(null)

    ExpoSpeechRecognitionModule.start({
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      androidIntentOptions: {
        EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        EXTRA_ENABLE_LANGUAGE_SWITCH: "balanced",
      },
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

  return { state, transcript, volume,error, requestPermissions, start, stop, cancel };
}
