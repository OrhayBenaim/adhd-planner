import { forwardRef, useState, useMemo, useEffect } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { timeSelectionToTime } from "../../lib/dateTimeConvert";
import { GradientOption } from "../GradientOption";
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS, VISIBLE_TOUR_STEP_COUNT } from "../tour/constants";

interface Props {
  onClose: () => void;
}

export const SelectTimeSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useTaskCreationFlow();
    const tour = useGuidedTour();
    const isSelected = (time: string) => {
      if (!flow.editingExistingTaskId || !flow.selectedTime) return false;
      return timeSelectionToTime(time) === flow.selectedTime;
    };
    const [customValue, setCustomValue] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const snapPoints = useMemo(
      () => [showCustomInput ? "50%" : "28%"],
      [showCustomInput],
    );

    useEffect(() => {
      if (showCustomInput) {
        (ref as React.RefObject<BottomSheet | null>)?.current?.snapToIndex(0);
      }
    }, [showCustomInput, ref]);

    const handleSelect = (time: string) => {
      if (time === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      flow.selectTime(time);
      if (tour?.isTourStep("pickTime")) tour.advance();
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        flow.selectTime(customValue.trim());
        if (tour?.isTourStep("pickTime")) tour.advance();
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={!tour?.isTourStep("pickTime")}
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">What time?</Text>
            {!tour?.isTourStep("pickTime") && (
              <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            )}
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
                  autoFocus
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
                showMascot={false}
                stepNumber={TOUR_STEPS[3].step}
                totalSteps={VISIBLE_TOUR_STEP_COUNT}
                arrow="up"
              />
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
