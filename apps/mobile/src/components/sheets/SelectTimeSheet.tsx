import { forwardRef } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

function GradientOption({ label, colors, onPress }: { label: string; colors: [string, string]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onSelect: (time: "noon" | "afternoon" | "end_of_day" | "custom") => void;
  onClose: () => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  showCustomInput: boolean;
}

export const SelectTimeSheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose, customValue, onCustomChange, showCustomInput }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["28%", "40%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">What time?</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="By Noon" colors={["#bde0fe", "#a2d2ff"]} onPress={() => onSelect("noon")} />
              <GradientOption label="By Afternoon" colors={["#a2d2ff", "#cdb4db"]} onPress={() => onSelect("afternoon")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="By End of Day" colors={["#cdb4db", "#ffc8dd"]} onPress={() => onSelect("end_of_day")} />
              <GradientOption label="Custom" colors={["#ffc8dd", "#ffafcc"]} onPress={() => onSelect("custom")} />
            </View>
            {showCustomInput && (
              <TextInput
                className="border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939] mt-1"
                placeholder="e.g. 14:30"
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
