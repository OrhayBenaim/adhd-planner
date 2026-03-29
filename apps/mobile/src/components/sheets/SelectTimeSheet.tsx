import { forwardRef, useState } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow } from "../home/SheetFlowProvider";
import { timeSelectionToTime } from "../../lib/dateTimeConvert";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS } from "../tour/constants";

function GradientOption({ label, colors, onPress, selected }: { label: string; colors: [string, string]; onPress: () => void; selected?: boolean }) {
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
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}>
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

export const SelectTimeSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useSheetFlow();
    const tour = useGuidedTour();
    const isSelected = (time: string) => {
      if (!flow.editingExistingTaskId || !flow.selectedTime) return false;
      return timeSelectionToTime(time) === flow.selectedTime;
    };
    const [customValue, setCustomValue] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const handleSelect = (time: string) => {
      if (time === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      const timeStr = timeSelectionToTime(time);
      flow.setTime(timeStr);
      flow.next();
      if (tour?.isTourStep("pickTime")) tour.advance();
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        const timeStr = timeSelectionToTime(customValue.trim());
        flow.setTime(timeStr);
        flow.next();
        if (tour?.isTourStep("pickTime")) tour.advance();
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
            <Text className="text-xl font-semibold text-[#1e2939]">What time?</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="By Morning" colors={["#bde0fe", "#a2d2ff"]} onPress={() => handleSelect("noon")} selected={isSelected("noon")} />
              <GradientOption label="By Afternoon" colors={["#a2d2ff", "#cdb4db"]} onPress={() => handleSelect("afternoon")} selected={isSelected("afternoon")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="By Evening" colors={["#cdb4db", "#ffc8dd"]} onPress={() => handleSelect("end_of_day")} selected={isSelected("end_of_day")} />
              <GradientOption label="Custom" colors={["#ffc8dd", "#ffafcc"]} onPress={() => handleSelect("custom")} />
            </View>
            {showCustomInput && (
              <View className="flex-row items-center gap-2 mt-1">
                <BottomSheetTextInput
                  className="flex-1 border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939]"
                  placeholder="e.g. 14:30"
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
          {tour?.isTourStep("pickTime") && (
            <View className="mt-4">
              <TourTooltip
                title={TOUR_STEPS[3].title}
                description={TOUR_STEPS[3].description}
              />
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
