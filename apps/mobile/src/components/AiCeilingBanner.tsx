import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface AiCeilingBannerProps {
  onUpgrade: () => void;
  onBuyCredits?: () => void;
  reason?: string;
  creditBalance?: number;
}

export function AiCeilingBanner({
  onUpgrade,
  onBuyCredits,
  reason,
  creditBalance,
}: AiCeilingBannerProps) {
  return (
    <View className="bg-[#fff3cd] rounded-2xl px-4 py-3 mb-3 gap-2">
      <View className="flex-row items-center gap-3">
        <Ionicons name="sparkles-outline" size={20} color="#856404" />
        <View className="flex-1">
          <Text className="text-xs text-[#856404]">
            {reason ?? "AI scoring limit reached this month"}
          </Text>
          {creditBalance !== undefined && creditBalance > 0 && (
            <Text className="text-xs text-[#856404] mt-0.5">
              {creditBalance} credit{creditBalance === 1 ? "" : "s"} remaining
            </Text>
          )}
        </View>
      </View>
      <View className="flex-row gap-2 justify-end">
        {onBuyCredits && (
          <Pressable onPress={onBuyCredits}>
            <View className="bg-[#856404] rounded-full px-3 py-1">
              <Text className="text-xs font-medium text-white">
                Buy Credits
              </Text>
            </View>
          </Pressable>
        )}
        <Pressable onPress={onUpgrade}>
          <View className="bg-[#a2d2ff] rounded-full px-3 py-1">
            <Text className="text-xs font-medium text-white">Upgrade</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
