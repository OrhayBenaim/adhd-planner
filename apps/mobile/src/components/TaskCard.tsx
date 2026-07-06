import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInRight,
  FadeOutLeft,
} from "react-native-reanimated";
import type { Task } from "@adhd-planner/types";
import { getDifficultyLabel } from "../lib/moodLabels";
import { SPRING_BOUNCY } from "../animations/springs";

interface Props {
  task: Task | null;
  onComplete: (task: Task) => void;
  onLater: () => void;
  onSurveyPress?: (task: Task) => void;
  hideLater?: boolean;
}

export function TaskCard({
  task,
  onComplete,
  onLater,
  onSurveyPress,
  hideLater,
}: Props) {
  const completeScale = useSharedValue(1);
  const laterScale = useSharedValue(1);
  const isSurveyTask = task?.sourceType === "survey";

  const handlePrimaryPress = () => {
    completeScale.value = withSequence(
      withSpring(0.92, SPRING_BOUNCY),
      withSpring(1, SPRING_BOUNCY),
    );
    setTimeout(() => {
      if (!task) return;
      if (isSurveyTask) {
        onSurveyPress?.(task);
      } else {
        onComplete(task);
      }
    }, 200);
  };

  const completeBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const laterBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: laterScale.value }],
  }));

  if (!task) {
    return (
      <View
        className="bg-white border border-[#f3f4f6] rounded-3xl px-6 py-6 items-center"
        style={{ boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)" }}
      >
        <Text className="text-[#99a1af] text-base text-center">
          No task selected yet
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInRight.duration(300)}
      exiting={FadeOutLeft.duration(250)}
      className="bg-white border border-[#f3f4f6] rounded-3xl p-6"
      style={{ boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)" }}
    >
      {isSurveyTask ? (
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="clipboard-outline" size={16} color="#6a7282" />
          <Text className="text-xs font-medium text-[#6a7282] uppercase tracking-wide">
            Survey
          </Text>
        </View>
      ) : null}

      <Text className="text-lg font-medium text-[#1e2939] mb-1">{task.title}</Text>
      {task.description ? (
        <Text className="text-sm text-[#4a5565] mb-3">{task.description}</Text>
      ) : null}

      {!isSurveyTask ? (
        <Text className="text-xs text-[#6a7282] mb-4">
          {getDifficultyLabel(task.difficulty)}
        </Text>
      ) : null}

      <View className="flex-row gap-3">
        <Animated.View style={[completeBtnStyle, { flex: 1 }]}>
          <Pressable
            onPress={handlePrimaryPress}
            className="bg-[#a2d2ff] rounded-3xl py-3 items-center flex-row justify-center gap-2"
          >
            <Ionicons
              name={isSurveyTask ? "create-outline" : "checkmark"}
              size={18}
              color="#0a0a0a"
            />
            <Text className="text-base font-medium text-[#0a0a0a]">
              {isSurveyTask ? "Take survey" : " Complete"}
            </Text>
          </Pressable>
        </Animated.View>

        {!hideLater && !isSurveyTask && (
          <Animated.View style={laterBtnStyle}>
            <Pressable
              onPress={onLater}
              onPressIn={() => {
                laterScale.value = withSpring(0.92, SPRING_BOUNCY);
              }}
              onPressOut={() => {
                laterScale.value = withSpring(1, SPRING_BOUNCY);
              }}
              className="bg-[#ffc8dd] rounded-3xl py-3 px-5 items-center"
            >
              <Text className="text-sm font-medium text-[#0a0a0a]">Later</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
