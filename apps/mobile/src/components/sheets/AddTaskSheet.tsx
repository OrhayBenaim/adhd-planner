import { forwardRef, useState } from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

interface Props {
  onConfirm: (title: string) => void;
  onMicPress: () => void;
  onClose: () => void;
}

export const AddTaskSheet = forwardRef<BottomSheet, Props>(
  ({ onConfirm, onMicPress, onClose }, ref) => {
    const [text, setText] = useState("");
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
      onConfirm(text.trim());
      setText("");
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">Add New Task</Text>
            <Pressable onPress={onClose}>
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
            <Animated.View style={micStyle}>
              <Pressable
                onPress={onMicPress}
                onPressIn={() => { micScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                onPressOut={() => { micScale.value = withSpring(1, SPRING_BOUNCY); }}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: "#a2d2ff" }}
              >
                <Ionicons name="mic-outline" size={26} color="#fff" />
              </Pressable>
            </Animated.View>

            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => { confirmScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                onPressOut={() => { confirmScale.value = withSpring(1, SPRING_BOUNCY); }}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: "#bde0fe", opacity: text.trim() ? 1 : 0.5 }}
              >
                <Ionicons name="checkmark" size={26} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
