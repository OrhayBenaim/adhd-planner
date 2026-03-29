import { forwardRef, useState } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow } from "../home/SheetFlowProvider";
import { daySelectionToDate } from "../../lib/dateTimeConvert";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS } from "../tour/constants";

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
  selected,
}: {
  label: string;
  colors: GradientPair;
  onPress: () => void;
  selected?: boolean;
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
        <View style={{ position: "relative" }}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
          </LinearGradient>
          {selected && (
            <View style={{
              position: "absolute", top: -4, right: -4,
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: "#fff",
              alignItems: "center", justifyContent: "center",
              boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.15)",
            }}>
              <Ionicons name="checkmark" size={14} color="#a2d2ff" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onClose: () => void;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useSheetFlow();
    const tour = useGuidedTour();
    const isSelected = (day: string) => {
      if (!flow.editingExistingTaskId || !flow.selectedDay) return false;
      return daySelectionToDate(day) === flow.selectedDay;
    };
    const [customValue, setCustomValue] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const handleSelect = (day: string) => {
      if (day === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      const dateStr = daySelectionToDate(day);
      flow.setDay(dateStr);
      flow.next();
      if (tour?.isTourStep("pickDay")) tour.advance();
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        const dateStr = daySelectionToDate(customValue.trim());
        flow.setDay(dateStr);
        flow.next();
        if (tour?.isTourStep("pickDay")) tour.advance();
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["28%", "40%"]}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">When is this due?</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="Today" colors={DAY_GRADIENTS[0]} onPress={() => handleSelect("today")} selected={isSelected("today")} />
              <GradientOption label="Tomorrow" colors={DAY_GRADIENTS[1]} onPress={() => handleSelect("tomorrow")} selected={isSelected("tomorrow")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="End of Week" colors={DAY_GRADIENTS[2]} onPress={() => handleSelect("end_of_week")} selected={isSelected("end_of_week")} />
              <GradientOption label="Custom" colors={DAY_GRADIENTS[3]} onPress={() => handleSelect("custom")} />
            </View>
            {showCustomInput && (
              <View className="flex-row items-center gap-2 mt-1">
                <BottomSheetTextInput
                  className="flex-1 border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939]"
                  placeholder="e.g. March 15"
                  placeholderTextColor="#99a1af"
                  value={customValue}
                  onChangeText={setCustomValue}
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSubmit}
                />
                <Pressable
                  onPress={handleCustomSubmit}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#a2d2ff", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
          {tour?.isTourStep("pickDay") && (
            <View className="mt-4">
              <TourTooltip
                title={TOUR_STEPS[2].title}
                description={TOUR_STEPS[2].description}
              />
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
