import { forwardRef } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

type GradientPair = [string, string];

const DAY_GRADIENTS: GradientPair[] = [
  ["#bde0fe", "#a2d2ff"],
  ["#a2d2ff", "#cdb4db"],
  ["#cdb4db", "#ffc8dd"],
  ["#ffc8dd", "#ffafcc"],
];

function GradientOption({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: GradientPair;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onSelect: (day: "today" | "tomorrow" | "end_of_week" | "custom") => void;
  onClose: () => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  showCustomInput: boolean;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose, customValue, onCustomChange, showCustomInput }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["35%", "50%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">When is this due?</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="Today" colors={DAY_GRADIENTS[0]} onPress={() => onSelect("today")} />
              <GradientOption label="Tomorrow" colors={DAY_GRADIENTS[1]} onPress={() => onSelect("tomorrow")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="End of Week" colors={DAY_GRADIENTS[2]} onPress={() => onSelect("end_of_week")} />
              <GradientOption label="Custom" colors={DAY_GRADIENTS[3]} onPress={() => onSelect("custom")} />
            </View>
            {showCustomInput && (
              <TextInput
                className="border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939] mt-1"
                placeholder="e.g. March 15"
                placeholderTextColor="#99a1af"
                value={customValue}
                onChangeText={onCustomChange}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
