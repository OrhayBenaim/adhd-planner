import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Task } from "@adhd-planner/types";
import { AppPressable } from "./AppPressable";
import { OnboardingButton } from "./onboarding/OnboardingButton";
import { homeStyles } from "./home/theme";
import { getDifficultyLabel } from "../lib/moodLabels";

interface Props {
  task: Task | null;
  onComplete: (task: Task) => Promise<void>;
  onPick: () => void;
  onAdd: () => void;
  hasTasks: boolean;
  pickButtonRef?: React.Ref<View>;
  completeButtonRef?: React.Ref<View>;
}

export function TaskCard({ task, onComplete, onPick, onAdd, hasTasks, pickButtonRef, completeButtonRef }: Props) {
  const completing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function complete() {
    if (!task || completing.current) return;
    completing.current = true;
    setBusy(true);
    setError(null);
    try { await onComplete(task); }
    catch { setError("Couldn't complete this task. Please try again."); }
    finally { completing.current = false; setBusy(false); }
  }
  return <View style={homeStyles.card}>
    <Text style={homeStyles.eyebrow}>YOUR NEXT STEP</Text>
    <Text style={homeStyles.heading}>{task?.title ?? (hasTasks ? "One thing at a time" : "Make room for a small win")}</Text>
    <Text style={homeStyles.body}>{task?.description || (task ? "Start with just one thing." : hasTasks ? "Let’s find a task for your energy right now." : "Add something you’d like to get done. Big or tiny.")}</Text>
    {task && <Text style={homeStyles.caption}>{getDifficultyLabel(task.difficulty)}</Text>}
    <View ref={completeButtonRef} collapsable={false}>
      <OnboardingButton label={task ? (busy ? "Saving…" : "✓   Done") : "Add a task"}
        onPress={task ? complete : onAdd} disabled={busy} />
    </View>
    <View ref={pickButtonRef} collapsable={false}>
      <AppPressable accessibilityRole="button" disabled={busy} onPress={onPick}
        style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={[homeStyles.caption, { fontSize: 14, lineHeight: 20, textDecorationLine: "underline" }]}>{task ? "Pick a different" : "Pick for me"}</Text>
      </AppPressable>
    </View>
    {error && <Text accessibilityRole="alert" style={homeStyles.caption}>{error}</Text>}
  </View>;
}
