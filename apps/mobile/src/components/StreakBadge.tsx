import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <View className="flex-row items-center justify-center gap-1.5 py-2">
      <Ionicons name="flame" size={20} color="#ff9f43" />
      <Text className="text-sm font-semibold text-[#1e2939]">
        {streak} day streak
      </Text>
    </View>
  );
}
