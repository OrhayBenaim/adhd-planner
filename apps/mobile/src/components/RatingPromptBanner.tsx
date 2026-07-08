import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Mascot } from "./mascot/Mascot";

interface Props {
  onRate: () => void;
  onDismiss: () => void;
}

export function RatingPromptBanner({ onRate, onDismiss }: Props) {
  return (
    <View
      className="bg-white border border-[#cdb4db] rounded-3xl p-4 mb-4"
      style={{ boxShadow: "0px 2px 8px rgba(205, 180, 219, 0.35)" }}
    >
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss rating prompt"
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full items-center justify-center bg-[#f5f7fa]"
      >
        <Ionicons name="close" size={16} color="#6a7282" />
      </Pressable>

      <View className="flex-row items-center gap-3 pr-8">
        <Mascot pose="star" size={80} animated={false} />
        <View className="flex-1">
          <Text className="text-base font-medium text-[#1e2939] mb-1">
            Enjoying Lullio?
          </Text>
          <Text className="text-sm text-[#4a5565] mb-3">
            A quick rating helps other ADHD brains find us.
          </Text>

          <Pressable
            onPress={onRate}
            accessibilityRole="button"
            accessibilityLabel="Rate Lullio"
          >
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 20,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Text className="text-white font-semibold text-base">Rate Lullio</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
