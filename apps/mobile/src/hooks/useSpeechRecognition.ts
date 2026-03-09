import { useState, useCallback, useRef, useEffect } from "react";

export type SpeechState = "idle" | "listening" | "stopped" | "error";

interface UseSpeechRecognitionResult {
  state: SpeechState;
  transcript: string;
  volume: number;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  append: () => Promise<void>;
  error: string | null;
}

/**
 * Stubbed speech recognition hook.
 * TODO: Replace with a working STT library.
 */
export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);

  // Animate volume while "listening"
  useEffect(() => {
    if (state !== "listening") return;
    let t = 0;
    const interval = setInterval(() => {
      t += 1;
      const base = 0.25 + Math.sin(t * 0.3) * 0.15;
      const jitter = Math.random() * 0.15;
      setVolume(base + jitter);
    }, 100);
    return () => clearInterval(interval);
  }, [state]);

  const start = useCallback(async () => {
    setState("listening");
    setTranscript("");
  }, []);

  const stop = useCallback(() => {
    setState("stopped");
    setVolume(0);
  }, []);

  const cancel = useCallback(() => {
    setState("idle");
    setTranscript("");
    setVolume(0);
  }, []);

  const append = useCallback(async () => {
    setState("listening");
  }, []);

  return { state, transcript, volume, start, stop, cancel, append, error: null };
}
