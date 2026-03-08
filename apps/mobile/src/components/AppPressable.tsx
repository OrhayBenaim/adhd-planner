import { Pressable, type PressableProps } from "react-native";
import { useSoundEnabled } from "../lib/soundStore";

export function AppPressable(props: PressableProps) {
  const soundEnabled = useSoundEnabled();
  return <Pressable android_disableSound={!soundEnabled} {...props} />;
}
