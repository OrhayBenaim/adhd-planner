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
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow, type PendingTask } from "../home/SheetFlowProvider";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { splitTranscription } from "../../lib/taskSplitter";
import { posthog } from "../../lib/posthog";
import { ScrollingWaveform } from "../ScrollingWaveform";

let nextId = 0;
function genId() {
  return `pending-${++nextId}`;
}

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

interface Props {
  onClose: () => void;
}

export const AddTaskSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const flow = useSheetFlow();
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

    const micScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);

    const micStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));

    const snapPoints = useMemo(
      () => [mode === "recording" ? "45%" : "38%"],
      [mode],
    );

    const handleMicPress = async () => {
      Keyboard.dismiss();
      await requestPermissions();
      posthog.capture("voice_input_used");
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

      const splitTasks = splitTranscription(text);
      if (splitTasks.length <= 1) {
        flow.setTitle(splitTasks[0] || text.trim());
      } else {
        const pending: PendingTask[] = splitTasks.map((title) => ({
          id: genId(),
          title,
          dueDate: "",
          dueTime: "",
        }));
        flow.setPendingTasks(pending);
      }
      flow.next();
      dispatch({ type: "setText", text: "" });
    };

    const handleRecordingConfirm = () => {
      stopRecording();
      const spoken = transcript.trim();
      if (!spoken) return;

      const splitTasks = splitTranscription(spoken);

      if (splitTasks.length <= 1) {
        flow.setTitle(splitTasks[0] || spoken);
      } else {
        const pending: PendingTask[] = splitTasks.map((title) => ({
          id: genId(),
          title,
          dueDate: "",
          dueTime: "",
        }));
        flow.setPendingTasks(pending);
      }
      flow.next();
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
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">
              {isEditing ? "Edit Task" : "Add New Task"}
            </Text>
            <Pressable onPress={handleClose}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Body: text input or recording */}
          {mode === "text" ? (
            <BottomSheetTextInput
              className="border border-[#e5e7eb] rounded-3xl p-4 text-base text-[#1e2939] min-h-[128px]"
              placeholder="Describe your task..."
              placeholderTextColor="#99a1af"
              value={text}
              onChangeText={(t) => dispatch({ type: "setText", text: t })}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <>
              {/* Transcript display */}
              <View
                className="min-h-[128px] rounded-3xl px-4 py-4 mb-2"
                style={{ borderWidth: 1.1, borderColor: "#e5e7eb" }}
              >
                <Text
                  className="text-base leading-6"
                  style={{ color: transcript ? "#1e2939" : "#99a1af" }}
                >
                  {transcript || "Describe your task..."}
                </Text>
              </View>

             
            </>
          )}

          {/* Action buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-4">
            { mode === 'recording' &&
              <LinearGradient
                colors={["rgba(162,210,255,0.2)", "rgba(205,180,219,0.2)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  height: 48,
                  borderRadius: 9999,
                  flexDirection: "row",
                  alignItems: "center",
                  overflow: "hidden",
                  flex: 1
                }}
              >
                <ScrollingWaveform volume={volume} />
              </LinearGradient>}
            {/* Mic / Cancel-recording button */}
            {!isEditing && (
              <Animated.View style={micStyle}>
                <Pressable
                  onPress={mode !== "recording" ? handleMicPress : handleCancelRecording}
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
                      boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Ionicons
                      name={mode === "recording"  ? "close" : "mic-outline"}
                      size={28}
                      color="#fff"
                    />
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Confirm button */}
            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={mode === "text" ? handleTextConfirm : handleRecordingConfirm}
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
                    opacity: confirmHasContent ? 1 : 0.5,
                    boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.1)",
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
