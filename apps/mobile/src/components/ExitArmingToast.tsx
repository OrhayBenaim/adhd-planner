import { View, Text } from "react-native";

/** Small ephemeral toast for Android exit arming (same family as survey reward toast). */
export function ExitArmingToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View className="absolute top-24 left-0 right-0 items-center z-[950] px-6">
      <View className="bg-white rounded-full px-5 py-3 shadow-sm border border-[#f3f4f6]">
        <Text className="text-sm font-medium text-[#0A0A0A]">
          Press back again to exit
        </Text>
      </View>
    </View>
  );
}
