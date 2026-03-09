import { forwardRef, useState, useEffect } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow } from "../home/SheetFlowProvider";

interface Props {
  onClose: () => void;
}

export const AddTaskSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useSheetFlow();
    const isEditing = !!flow.editingExistingTaskId;
    const [text, setText] = useState("");

    useEffect(() => {
      if (flow.editingExistingTaskId && flow.title) {
        setText(flow.title);
      }
    }, [flow.editingExistingTaskId, flow.title]);
    const micScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);

    const micStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));

    const handleConfirm = () => {
      if (!text.trim()) return;
      Keyboard.dismiss();
      flow.setTitle(text.trim());
      flow.next();
      setText("");
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["38%"]}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">{isEditing ? "Edit Task" : "Add New Task"}</Text>
            <Pressable onPress={() => flow.reset()}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Textarea */}
          <BottomSheetTextInput
            className="border border-[#e5e7eb] rounded-3xl p-4 text-base text-[#1e2939] min-h-[128px]"
            placeholder="Describe your task..."
            placeholderTextColor="#99a1af"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />

          {/* Action buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-4">
            {!isEditing && (
              <Animated.View style={micStyle}>
                <Pressable
                  onPress={() => flow.start("recording")}
                  onPressIn={() => { micScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                  onPressOut={() => { micScale.value = withSpring(1, SPRING_BOUNCY); }}
                >
                  <LinearGradient
                    colors={["#a2d2ff", "#cdb4db"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 9999,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 15,
                      elevation: 8,
                    }}
                  >
                    <Ionicons name="mic-outline" size={28} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => { confirmScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                onPressOut={() => { confirmScale.value = withSpring(1, SPRING_BOUNCY); }}
              >
                <LinearGradient
                  colors={["#bde0fe", "#a2d2ff"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 9999,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: text.trim() ? 1 : 0.5,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 15,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="checkmark" size={28} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
