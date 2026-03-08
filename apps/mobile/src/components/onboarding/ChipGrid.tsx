import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  items: readonly ChipItem[];
  selected: string[];
  onToggle: (id: string) => void;
  variant: "difficulties" | "strengths";
}

const COLORS = {
  difficulties: {
    border: "#ffafcc",
    gradient: ["rgba(255,200,221,0.2)", "rgba(255,175,204,0.2)"] as [string, string],
    badge: "#ffafcc",
  },
  strengths: {
    border: "#a2d2ff",
    gradient: ["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"] as [string, string],
    badge: "#a2d2ff",
  },
};

export function ChipGrid({ items, selected, onToggle, variant }: Props) {
  const colors = COLORS[variant];

  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => {
        const isSelected = selected.includes(item.label);

        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle(item.label)}
            className="relative"
            style={{ width: "47%" }}
          >
            {isSelected ? (
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-[20px] px-4 py-3 min-h-[47px] justify-center"
                style={{ borderWidth: 1.5, borderColor: colors.border }}
              >
                <Text className="text-sm font-medium text-[#1e2939] text-center">
                  {item.label}
                </Text>
              </LinearGradient>
            ) : (
              <View
                className="rounded-[20px] px-4 py-3 min-h-[47px] justify-center"
                style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
              >
                <Text className="text-sm font-medium text-[#364153] text-center">
                  {item.label}
                </Text>
              </View>
            )}

            {/* Checkmark badge */}
            {isSelected && (
              <View
                className="absolute -top-2 right-[-4px] w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.badge }}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
