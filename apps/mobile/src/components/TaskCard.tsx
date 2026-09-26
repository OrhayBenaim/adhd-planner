import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Task } from "@adhd-planner/types";
import { OnboardingButton } from "./onboarding/OnboardingButton";
import { homeStyles } from "./home/theme";
import { getDifficultyLabel } from "../lib/moodLabels";

interface Props {
  task: Task;
  onComplete: (task: Task) => Promise<void>;
  completeButtonRef?: React.Ref<View>;
}

/** The Next step card. Empty states live in NextStepEmptyState. */
export function TaskCard({ task, onComplete, completeButtonRef }: Props) {
  const completing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function complete() {
    if (completing.current) return;
    completing.current = true;
    setBusy(true);
    setError(null);
    try { await onComplete(task); }
    catch { setError("Couldn't complete this task. Please try again."); }
    finally { completing.current = false; setBusy(false); }
  }

  return <View style={homeStyles.card}>
    <Text style={homeStyles.eyebrow}>YOUR NEXT STEP</Text>
    <Text style={homeStyles.heading}>{task.title}</Text>
    <Text style={homeStyles.body}>{task.description || "Start with just one thing."}</Text>
    <Text style={homeStyles.caption}>{getDifficultyLabel(task.difficulty)}</Text>
    <View ref={completeButtonRef} collapsable={false}>
      <OnboardingButton label="✓   Done" onPress={complete} loading={busy} />
    </View>
    {error && <Text accessibilityRole="alert" style={homeStyles.caption}>{error}</Text>}
  </View>;
}
