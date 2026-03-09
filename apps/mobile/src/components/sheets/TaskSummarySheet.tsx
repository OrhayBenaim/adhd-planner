import { forwardRef, useCallback } from "react";
import { View, Text, TextInput } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow, type PendingTask } from "../home/SheetFlowProvider";

interface Props {
  onClose: () => void;
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
    <View className="bg-[#f5f7fa] rounded-2xl px-4 py-3 mb-3">
      <View className="flex-row items-start gap-3">
        {/* Editable title */}
        <View className="flex-1">
          <TextInput
            className="text-base text-[#1e2939] font-medium p-0"
            value={task.title}
            onChangeText={onTitleChange}
            multiline
          />
          {/* Date/time pills */}
          <View className="flex-row gap-2 mt-2">
            <Pressable
              onPress={onEditDate}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(162,210,255,0.3)" }}
            >
              <Text className="text-xs text-[#1e2939]">{task.dueDate}</Text>
            </Pressable>
            <Pressable
              onPress={onEditTime}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,200,221,0.3)" }}
            >
              <Text className="text-xs text-[#1e2939]">{task.dueTime}</Text>
            </Pressable>
          </View>
        </View>
        {/* Delete button */}
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(248,113,113,0.15)" }}
        >
          <Ionicons name="close" size={16} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
}

export const TaskSummarySheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useSheetFlow();
    const createScale = useSharedValue(1);
    const createStyle = useAnimatedStyle(() => ({
      transform: [{ scale: createScale.value }],
    }));

    const updateTitle = useCallback(
      (id: string, title: string) => {
        flow.setPendingTasks(
          flow.pendingTasks.map((t) => (t.id === id ? { ...t, title } : t))
        );
      },
      [flow]
    );

    const removeTask = useCallback(
      (id: string) => {
        const updated = flow.pendingTasks.filter((t) => t.id !== id);
        if (updated.length === 0) {
          flow.reset();
        } else {
          flow.setPendingTasks(updated);
        }
      },
      [flow]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%", "85%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{
          borderTopLeftRadius: 48,
          borderTopRightRadius: 48,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6 flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-[#1e2939]">
              We detected {flow.pendingTasks.length} tasks
            </Text>
            <Pressable onPress={() => flow.reset()}>
              <Ionicons name="close" size={24} color="#364153" />
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
                onTitleChange={(title) => updateTitle(task.id, title)}
                onDelete={() => removeTask(task.id)}
                onEditDate={() => flow.editDateTime(task.id, "dueDate")}
                onEditTime={() => flow.editDateTime(task.id, "dueTime")}
              />
            ))}
          </BottomSheetScrollView>

          {/* Bottom buttons */}
          <View className="flex-row gap-3 pb-6 pt-3">
            <Pressable
              onPress={() => flow.reset()}
              className="flex-1 py-4 rounded-full items-center"
              style={{ backgroundColor: "#f5f7fa" }}
            >
              <Text className="text-[#6a7282] font-medium">Cancel</Text>
            </Pressable>

            <Animated.View style={[createStyle, { flex: 1 }]}>
              <Pressable
                onPress={() => flow.next()}
                onPressIn={() => {
                  createScale.value = withSpring(0.95, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  createScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="py-4 rounded-full items-center"
                style={{ backgroundColor: "#a2d2ff" }}
              >
                <Text className="text-white font-semibold">
                  Create All ({flow.pendingTasks.length})
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
