import { forwardRef, useState, useMemo, useEffect, useCallback } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { daySelectionToDate } from "../../lib/dateTimeConvert";
import { ScheduleTourBackdrop } from "../tour/ScheduleTourBackdrop";
import { ScheduleOption } from "./ScheduleOption";
import { homeStyles } from "../home/theme";
import { useGuidedTour } from "../tour/GuidedTourProvider";



interface Props {
  onClose: () => void;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useTaskCreationFlow();
    const tour = useGuidedTour();
    const daySheetTour = tour?.daySheetTour ?? null;
    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => <ScheduleTourBackdrop {...props} tour={daySheetTour} />, [daySheetTour]);
    const isSelected = (day: string) => {
      if (!flow.editingExistingTaskId || !flow.selectedDay) return false;
      return daySelectionToDate(day) === flow.selectedDay;
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

    const handleSelect = (day: string) => {
      if (day === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      flow.selectDay(day);
      tour?.reportDaySelected();
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        flow.selectDay(customValue.trim());
        tour?.reportDaySelected();
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        backdropComponent={renderBackdrop}
        snapPoints={snapPoints}
        enablePanDownToClose={!daySheetTour?.lockSheet}
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        enableDynamicSizing
        backgroundStyle={{ borderTopLeftRadius: 36, borderTopRightRadius: 36 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text style={[homeStyles.heading, { fontSize: 28, lineHeight: 36 }]}>When is this due?</Text>
            {!daySheetTour?.lockSheet && (
              <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            )}
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <ScheduleOption label="Today" onPress={() => handleSelect("today")} selected={isSelected("today")} />
              <ScheduleOption label="Tomorrow" onPress={() => handleSelect("tomorrow")} selected={isSelected("tomorrow")} />
            </View>
            <View className="flex-row gap-3">
              <ScheduleOption label="End of week" onPress={() => handleSelect("end_of_week")} selected={isSelected("end_of_week")} />
              <ScheduleOption label="Pick a day" onPress={() => handleSelect("custom")} />
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
                  autoFocus
                />
                <Pressable
                  onPress={handleCustomSubmit}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#771344", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
          <Text style={[homeStyles.caption, { marginTop: 16 }]}>Pick a date opens a small date field.</Text>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
