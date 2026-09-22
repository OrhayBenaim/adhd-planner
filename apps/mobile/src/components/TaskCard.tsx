import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Task } from "@adhd-planner/types";
import { OnboardingButton } from "./onboarding/OnboardingButton";
import { homeStyles } from "./home/theme";
import { getDifficultyLabel } from "../lib/moodLabels";

interface Props {
  task: Task | null;
  onComplete: (task: Task) => Promise<void>;
  onAdd: () => void;
  hasTasks: boolean;
  completeButtonRef?: React.Ref<View>;
}

export function TaskCard({ task, onComplete, onAdd, hasTasks, completeButtonRef }: Props) {
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

  // Nothing to show: either there is no task at all, or none fits the current mood.
  if (!task) {
    return <View style={[homeStyles.card, { paddingVertical: 28, paddingHorizontal: 20, gap: 12, alignItems: "center" }]}>
      <Text style={[homeStyles.heading, { fontSize: 24, lineHeight: 26, textAlign: "center" }]}>
        {hasTasks ? "One thing at a time" : "Nothing planned yet"}
      </Text>
      <Text style={[homeStyles.body, { textAlign: "center" }]}>
        {hasTasks
          ? "Nothing matches your energy right now. Try moving the slider."
          : "Add one small thing and it will show up here."}
      </Text>
      <View style={{ alignSelf: "stretch" }}>
        <OnboardingButton label="Add a task" onPress={onAdd} />
      </View>
    </View>;
  }

  return <View style={homeStyles.card}>
    <Text style={homeStyles.eyebrow}>YOUR NEXT STEP</Text>
    <Text style={homeStyles.heading}>{task.title}</Text>
    <Text style={homeStyles.body}>{task.description || "Start with just one thing."}</Text>
    <Text style={homeStyles.caption}>{getDifficultyLabel(task.difficulty)}</Text>
    <View ref={completeButtonRef} collapsable={false}>
      <OnboardingButton label={busy ? "Saving…" : "✓   Done"} onPress={complete} disabled={busy} />
    </View>
    {error && <Text accessibilityRole="alert" style={homeStyles.caption}>{error}</Text>}
  </View>;
}
