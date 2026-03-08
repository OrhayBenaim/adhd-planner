import { useState, useCallback, useRef } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
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
    const text = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      accumulatedRef.current = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      setTranscript(accumulatedRef.current);
      // Simulate volume drop on final result
      setVolume(0);
    } else {
      // Show accumulated + current partial
      const display = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      setTranscript(display);
      // Derive a pseudo-volume from transcript length changes for spectrograph
      setVolume(text.length > 0 ? Math.min(1, 0.3 + Math.random() * 0.5) : 0);
    }
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
