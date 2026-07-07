import { forwardRef } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  Layout,
} from "react-native-reanimated";
import type { Task } from "@adhd-planner/types";
import { getDifficultyLabel } from "../../lib/moodLabels";
import { formatDueDate } from "../../lib/dateTimeConvert";
import { useHome } from "../home/HomeProvider";
import { useSheetNav } from "../home/SheetNavProvider";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";

interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

function TaskItem({ task, onDelete, onEdit }: TaskItemProps) {
  return (
    <Animated.View
      entering={FadeInRight.springify().damping(18)}
      exiting={FadeOutLeft.duration(200)}
      layout={Layout.springify()}
      className="bg-[#f5f7fa] rounded-3xl p-4 mb-3"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-medium text-[#1e2939] mb-1">{task.title}</Text>
          {task.description ? (
            <Text className="text-sm text-[#4a5565] mb-1">{task.description}</Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-[#6a7282]">{getDifficultyLabel(task.difficulty)}</Text>
            {task.dueDate ? (
              <Text className="text-xs text-[#6a7282]">· {formatDueDate(task.dueDate)}</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onEdit(task)}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="create-outline" size={20} color="#364153" />
          </Pressable>
          <Pressable
            onPress={() => onDelete(task._id)}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#364153" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

interface Props {
  onClose: () => void;
}

export const AllTasksSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { tasks, deleteTask } = useHome();
    const { closeSheet } = useSheetNav();
    const flow = useTaskCreationFlow();

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["80%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-lg font-medium text-[#1e2939]">All Tasks</Text>
          <Pressable onPress={closeSheet}>
            <Ionicons name="close" size={24} color="#364153" />
          </Pressable>
        </View>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {tasks.map((task) => (
            <TaskItem
              key={task._id}
              task={task}
              onDelete={deleteTask}
              onEdit={(t) => flow.editExistingTask(t)}
            />
          ))}
          {tasks.length === 0 && (
            <Text className="text-center text-[#99a1af] mt-8">No tasks yet</Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
