import { forwardRef, useState } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { daySelectionToDate } from "../../lib/dateTimeConvert";
import { GradientOption, type GradientPair } from "../GradientOption";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS } from "../tour/constants";

const DAY_GRADIENTS: GradientPair[] = [
  ["#bde0fe", "#a2d2ff"],
  ["#a2d2ff", "#cdb4db"],
  ["#cdb4db", "#ffc8dd"],
  ["#ffc8dd", "#ffafcc"],
];

interface Props {
  onClose: () => void;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useTaskCreationFlow();
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
      flow.selectDay(day);
      if (tour?.isTourStep("pickDay")) tour.advance();
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        flow.selectDay(customValue.trim());
        if (tour?.isTourStep("pickDay")) tour.advance();
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["28%", "40%"]}
        enablePanDownToClose={!tour?.isTourStep("pickDay")}
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
            {!tour?.isTourStep("pickDay") && (
              <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            )}
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
