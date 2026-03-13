import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface StreakBadgeProps {
  streak: number;
  onPress?: () => void;
}

export function StreakBadge({ streak, onPress }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <Pressable onPress={onPress}>
      <View className="flex-row items-center justify-center gap-1.5 py-2">
        <Ionicons name="flame" size={20} color="#ff9f43" />
        <Text className="text-sm font-semibold text-[#1e2939]">
          {streak} day streak
        </Text>
        <Ionicons name="trophy-outline" size={16} color="#6a7282" />
      </View>
    </Pressable>
  );
}
