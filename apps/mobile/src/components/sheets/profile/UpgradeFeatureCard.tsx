import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "../../AppPressable";

const FEATURES = [
  { icon: "sparkles-outline" as const, label: "AI Coach", desc: "Smart notifications to keep you on track" },
  { icon: "grid-outline" as const, label: "Home Widgets", desc: "Quick access from your home screen" },
  { icon: "trophy-outline" as const, label: "Achievements", desc: "Earn badges for your progress" },
  { icon: "bar-chart-outline" as const, label: "Insights", desc: "See your 7-day completion trends" },
];

interface UpgradeFeatureCardProps {
  onUpgrade: () => void;
}

export function UpgradeFeatureCard({ onUpgrade }: UpgradeFeatureCardProps) {
  return (
    <View className="bg-[#cdb4db]/20 rounded-3xl px-4 py-5 mb-3">
      <Text className="text-base font-semibold text-[#0A0A0A] mb-3 text-center">
        Unlock Lullio Pro
      </Text>

      <View style={{ gap: 10 }} className="mb-4">
        {FEATURES.map((f) => (
          <View key={f.label} className="flex-row items-center" style={{ gap: 10 }}>
            <View className="w-8 h-8 rounded-full bg-[#cdb4db]/30 items-center justify-center">
              <Ionicons name={f.icon} size={16} color="#9b59b6" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#0A0A0A]">{f.label}</Text>
              <Text className="text-xs text-[#6A7282]">{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={onUpgrade}>
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 20, paddingVertical: 12, alignItems: "center" }}
        >
          <Text className="text-sm font-semibold text-white">Try Lullio Pro</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
