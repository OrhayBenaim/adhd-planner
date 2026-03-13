import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ProBadgeProps {
  size?: "sm" | "md";
}

export function ProBadge({ size = "sm" }: ProBadgeProps) {
  const textSize = size === "sm" ? "text-[9px]" : "text-[11px]";
  const px = size === "sm" ? "px-[6px]" : "px-2";
  const py = size === "sm" ? "py-[2px]" : "py-1";

  return (
    <LinearGradient
      colors={["#a2d2ff", "#cdb4db"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 100 }}
    >
      <View className={`${px} ${py}`}>
        <Text className={`${textSize} font-semibold text-white`}>PRO</Text>
      </View>
    </LinearGradient>
  );
}
