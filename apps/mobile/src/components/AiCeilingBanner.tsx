import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface AiCeilingBannerProps {
  onUpgrade: () => void;
}

export function AiCeilingBanner({ onUpgrade }: AiCeilingBannerProps) {
  return (
    <View className="bg-[#fff3cd] rounded-2xl px-4 py-3 mb-3 flex-row items-center gap-3">
      <Ionicons name="sparkles-outline" size={20} color="#856404" />
      <View className="flex-1">
        <Text className="text-xs text-[#856404]">
          AI scoring limit reached this month
        </Text>
      </View>
      <Pressable onPress={onUpgrade}>
        <View className="bg-[#a2d2ff] rounded-full px-3 py-1">
          <Text className="text-xs font-medium text-white">Upgrade</Text>
        </View>
      </Pressable>
    </View>
  );
}
