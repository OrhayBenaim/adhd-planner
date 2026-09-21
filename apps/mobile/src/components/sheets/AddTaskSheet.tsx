import { forwardRef, useReducer, useEffect, useMemo } from "react";
import { View, Text, Keyboard } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { track } from "../../lib/analytics";
import { ScrollingWaveform } from "../ScrollingWaveform";
import { homeColors, homeStyles } from "../home/theme";

const PLACEHOLDER = "#a99fb3";

type InputState = { text: string; mode: "text" | "recording" };
type InputAction =
  | { type: "setText"; text: string }
  | { type: "setMode"; mode: "text" | "recording" }
  | { type: "startEdit"; text: string }
  | { type: "reset" };

function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case "setText": return { ...state, text: action.text };
    case "setMode": return { ...state, mode: action.mode };
    case "startEdit": return { text: action.text, mode: "text" };
    case "reset": return { ...state, text: "" };
  }
}

function CircleButton({
  icon,
  onPress,
  tone,
  disabled = false,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone: "primary" | "soft";
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "primary" ? homeColors.primary : homeColors.selected,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Ionicons name={icon} size={26} color={tone === "primary" ? homeColors.white : homeColors.primary} />
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onClose: () => void;
}

export const AddTaskSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useTaskCreationFlow();
    const isEditing = !!flow.editingExistingTaskId;
    const [{ text, mode }, dispatch] = useReducer(inputReducer, { text: "", mode: "text" });

    const {
      transcript,
      volume,
      requestPermissions,
      start: startRecording,
      stop: stopRecording,
      cancel: cancelRecording,
    } = useSpeechRecognition(() => dispatch({ type: "setMode", mode: "text" }));

    useEffect(() => {
      if (flow.editingExistingTaskId && flow.title) {
        dispatch({ type: "startEdit", text: flow.title });
      } else if (!flow.editingExistingTaskId) {
        dispatch({ type: "reset" });
      }
    }, [flow.editingExistingTaskId, flow.title]);

    const snapPoints = useMemo(
      () => [mode === "recording" ? "43%" : "39%"],
      [mode],
    );

    const handleMicPress = async () => {
      Keyboard.dismiss();
      await requestPermissions();
      track("voice_input_used");
      dispatch({ type: "setMode", mode: "recording" });
      startRecording();
    };

    const handleCancelRecording = () => {
      cancelRecording();
      dispatch({ type: "setMode", mode: "text" });
    };

    const handleTextConfirm = () => {
      if (!text.trim()) return;
      Keyboard.dismiss();
      flow.submitInput(text);
      dispatch({ type: "setText", text: "" });
    };

    const handleRecordingConfirm = () => {
      stopRecording();
      const spoken = transcript.trim();
      if (!spoken) return;
      flow.submitInput(spoken);
      dispatch({ type: "setMode", mode: "text" });
    };

    const handleClose = () => {
      if (mode === "recording") cancelRecording();
      dispatch({ type: "setMode", mode: "text" });
      flow.reset();
    };

    const confirmHasContent =
      mode === "text" ? !!text.trim() : !!transcript.trim();

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={() => {
          if (mode === "recording") cancelRecording();
          dispatch({ type: "setMode", mode: "text" });
          onClose();
        }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        backgroundStyle={{ borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, gap: 18 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text style={[homeStyles.heading, { fontSize: 26, lineHeight: 35 }]}>
              {mode === "recording" ? "Listening…" : isEditing ? "Edit task" : "Add a task"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: homeColors.selected,
              }}
            >
              <Ionicons name="close" size={20} color={homeColors.primary} />
            </Pressable>
          </View>

          {/* Body: text input or live transcript */}
          {mode === "text" ? (
            <BottomSheetTextInput
              style={[
                homeStyles.body,
                {
                  height: 118,
                  padding: 16,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: homeColors.border,
                  backgroundColor: homeColors.surface,
                  color: homeColors.ink,
                },
              ]}
              placeholder="Describe your task…"
              placeholderTextColor={PLACEHOLDER}
              value={text}
              onChangeText={(t) => dispatch({ type: "setText", text: t })}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <View
              style={{
                height: 118,
                padding: 16,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: homeColors.primary,
                backgroundColor: homeColors.surface,
              }}
            >
              <Text style={[homeStyles.body, { color: transcript ? homeColors.ink : PLACEHOLDER }]}>
                {transcript || "Describe your task…"}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View
            className="flex-row items-center"
            style={{ gap: mode === "recording" ? 12 : 16, justifyContent: "flex-end" }}
          >
            {mode === "recording" && (
              <View
                style={{
                  flex: 1,
                  height: 60,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  overflow: "hidden",
                  backgroundColor: homeColors.selected,
                }}
              >
                <ScrollingWaveform volume={volume} />
              </View>
            )}

            {/* Mic, or cancel while recording */}
            {!isEditing && (
              <CircleButton
                tone="soft"
                icon={mode === "recording" ? "close" : "mic-outline"}
                accessibilityLabel={mode === "recording" ? "Cancel recording" : "Dictate a task"}
                onPress={mode === "recording" ? handleCancelRecording : handleMicPress}
              />
            )}

            <CircleButton
              tone="primary"
              icon="checkmark"
              accessibilityLabel="Save task"
              disabled={!confirmHasContent}
              onPress={mode === "text" ? handleTextConfirm : handleRecordingConfirm}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
