import { forwardRef } from "react";
import { View, Text, TextInput } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { SheetBackdrop } from "./SheetBackdrop";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";
import { homeColors, homeStyles } from "../home/theme";
import { useTaskCreationFlow, type PendingTask } from "../home/TaskCreationFlowProvider";

interface Props {
  onClose: () => void;
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: homeColors.selected, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
    >
      <Text style={{ fontFamily: "Inter-Regular", fontSize: 13, color: homeColors.primary }}>{label}</Text>
    </Pressable>
  );
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
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: homeColors.surface, borderColor: homeColors.border, borderWidth: 1,
        borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
      }}
    >
      <View style={{ flex: 1, gap: 8 }}>
        {/* Editable title */}
        <TextInput
          style={{ fontFamily: "Inter-SemiBold", fontSize: 16, color: homeColors.ink, padding: 0 }}
          value={task.title}
          onChangeText={onTitleChange}
          multiline
        />
        {/* Date/time pills */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pill label={task.dueDate} onPress={onEditDate} />
          <Pill label={task.dueTime} onPress={onEditTime} />
        </View>
      </View>
      {/* Remove button */}
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${task.title}`}
        style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: homeColors.selected }}
      >
        <Ionicons name="close" size={16} color={homeColors.primary} />
      </Pressable>
    </View>
  );
}

export const TaskSummarySheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useTaskCreationFlow();
    const createScale = useSharedValue(1);
    const createStyle = useAnimatedStyle(() => ({
      transform: [{ scale: createScale.value }],
    }));

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%", "85%"]}
        backdropComponent={SheetBackdrop}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <Text style={[homeStyles.heading, { fontSize: 26, lineHeight: 32 }]}>
              We found {flow.pendingTasks.length} tasks
            </Text>
            <Pressable
              onPress={() => flow.reset()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: homeColors.selected }}
            >
              <Ionicons name="close" size={20} color={homeColors.primary} />
            </Pressable>
          </View>

          {/* Task list */}
          <BottomSheetScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {flow.pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTitleChange={(title) => flow.updatePendingTitle(task.id, title)}
                onDelete={() => flow.removePendingTask(task.id)}
                onEditDate={() => flow.editDateTime(task.id, "dueDate")}
                onEditTime={() => flow.editDateTime(task.id, "dueTime")}
              />
            ))}
          </BottomSheetScrollView>

          {/* Bottom buttons */}
          <View style={{ flexDirection: "row", gap: 12, paddingTop: 18, paddingBottom: 28 }}>
            <Pressable
              onPress={() => flow.reset()}
              style={{
                flex: 1, height: 54, borderRadius: 999, alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: homeColors.primary,
              }}
            >
              <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 17, color: homeColors.primary }}>Cancel</Text>
            </Pressable>

            <Animated.View style={[createStyle, { flex: 1 }]}>
              <Pressable
                onPress={() => flow.confirmSummary()}
                onPressIn={() => {
                  createScale.value = withSpring(0.95, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  createScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                style={{ height: 54, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: homeColors.primary }}
              >
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 17, color: homeColors.white }}>
                  Create all {flow.pendingTasks.length}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
