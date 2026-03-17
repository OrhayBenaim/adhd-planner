import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "../../AppPressable";

const FEATURES = [
  { key: "ai_coach", icon: "sparkles-outline" as const, label: "AI Coach", desc: "Smart notifications to keep you on track" },
  { key: "home_widgets", icon: "grid-outline" as const, label: "Home Widgets", desc: "Quick access from your home screen" },
  { key: "achievements", icon: "trophy-outline" as const, label: "Achievements", desc: "Earn badges for your progress" },
  { key: "insights", icon: "bar-chart-outline" as const, label: "Insights", desc: "See your 7-day completion trends" },
];

interface UpgradeLockedTeasersProps {
  onUpgrade: (source: string) => void;
}

export function UpgradeLockedTeasers({ onUpgrade }: UpgradeLockedTeasersProps) {
  return (
    <View style={{ gap: 8 }}>
      {FEATURES.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onUpgrade(`teaser_${f.key}`)}
          className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center"
          style={{ gap: 12, opacity: 0.7 }}
        >
          <View className="w-10 h-10 rounded-full bg-[#cdb4db] items-center justify-center">
            <Ionicons name={f.icon} size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-[#0A0A0A]">{f.label}</Text>
            <Text className="text-xs text-[#6A7282]">{f.desc}</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
        </Pressable>
      ))}
    </View>
  );
}
