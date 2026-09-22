// apps/mobile/src/components/plan/PlanScreen.tsx
import { useCallback } from "react";
import { BackHandler, Platform, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import type { Task } from "@adhd-planner/types";

import { homeArtwork } from "../../../assets/home/artwork";
import { AppPressable } from "../AppPressable";
import { BottomNav } from "../BottomNav";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { HomeHeader } from "../home/HomeHeader";
import { homeColors, homeStyles } from "../home/theme";
import { useHome } from "../home/HomeProvider";
import { useSheetNav } from "../home/SheetNavProvider";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { getDifficultyLabel } from "../../lib/moodLabels";
import { groupTasksByDue } from "../../lib/taskGroups";

// Rows arrive top to bottom. The delay is capped because a long plan would
// otherwise leave the last row waiting seconds — past the cap rows land together,
// which is invisible anyway since they are below the fold.
const STAGGER_STEP_MS = 40;
const STAGGER_CAP_MS = 320;

function rowEntering(index: number) {
  return FadeInDown.duration(220)
    .delay(Math.min(index * STAGGER_STEP_MS, STAGGER_CAP_MS))
    .withInitialValues({ transform: [{ translateY: 30 }] });
}

function TaskRow({ task, index, onDelete, onEdit }: {
  task: Task;
  /** Position across every group, so the stagger reads down the whole list. */
  index: number;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const meta = [getDifficultyLabel(task.difficulty), task.dueTime].filter(Boolean).join(" · ");

  // FadeInDown starts below and rises to rest; 30px instead of the built-in 25.
  // Timing, not springs: the list reflows on every delete and again when a
  // task's difficulty resolves, and a spring wobbles on each one.
  return <Animated.View entering={rowEntering(index)} exiting={FadeOut.duration(150)}
    layout={LinearTransition.duration(200)}
    style={{ backgroundColor: homeColors.surface, borderWidth: 1, borderColor: homeColors.border,
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 19, color: homeColors.ink }}>{task.title}</Text>
      <Text style={homeStyles.caption}>{meta}</Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <AppPressable accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} hitSlop={8}
        onPress={() => onDelete(task._id)}>
        <SvgXml xml={homeArtwork.trash} width={20} height={20} />
      </AppPressable>
      <AppPressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} hitSlop={8}
        onPress={() => onEdit(task)}>
        <SvgXml xml={homeArtwork.chevron} width={20} height={20} />
      </AppPressable>
    </View>
  </Animated.View>;
}

function EmptyPlan({ onAdd }: { onAdd: () => void }) {
  return <View style={[homeStyles.card, { paddingVertical: 28, paddingHorizontal: 20, gap: 12, alignItems: "center" }]}>
    <Text style={[homeStyles.heading, { fontSize: 24, lineHeight: 26, textAlign: "center" }]}>Nothing planned yet</Text>
    <Text style={[homeStyles.body, { fontSize: 15, textAlign: "center" }]}>
      Add one small thing and it will show up here.
    </Text>
    <View style={{ alignSelf: "stretch" }}>
      <OnboardingButton label="Add a task" onPress={onAdd} />
    </View>
  </View>;
}

/** My plan: every open task grouped by when it is due (Figma 280:724 / 280:906). */
export function PlanScreen() {
  const router = useRouter();
  const { tasks, deleteTask } = useHome();
  const { closeSheet, isSheetOpen } = useSheetNav();
  const flow = useTaskCreationFlow();

  // Android back closes an open sheet first; otherwise it pops back to Today.
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isSheetOpen()) return false;
      closeSheet();
      return true;
    });
    return () => sub.remove();
  }, [isSheetOpen, closeSheet]));

  const goToday = useCallback(() => {
    closeSheet();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [closeSheet, router]);

  const groups = groupTasksByDue(tasks);
  // Reset every render so the stagger counts rows across groups, not within one.
  let rowIndex = 0;

  return <View style={{ flex: 1, backgroundColor: "white" }}>
    <HomeHeader title="My plan" onSettings={() => router.push("/settings")} />
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 }}>
      {groups.length === 0 ? (
        <EmptyPlan onAdd={() => flow.start()} />
      ) : (
        groups.map((group) => (
          <View key={group.label} style={{ gap: 8 }}>
            <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, lineHeight: 18, color: homeColors.body }}>
              {group.label}
            </Text>
            {group.tasks.map((task) => (
              <TaskRow key={task._id} task={task} index={rowIndex++} onDelete={deleteTask}
                onEdit={(t) => flow.editExistingTask(t)} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
    <BottomNav active="plan" onTodayPress={goToday} onListPress={() => {}}
      onAddPress={() => flow.start()} />
  </View>;
}
