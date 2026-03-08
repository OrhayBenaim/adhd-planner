import { forwardRef, useEffect } from "react";
import { View, Text, Alert, Linking, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { SPRING_BOUNCY } from "../../animations/springs";

interface Props {
  onStop: (transcription: string) => void;
  onClose: () => void;
}

const DOT_COUNT = 20;

function SpectroDot({ volume, index }: { volume: number; index: number }) {
  const height = useSharedValue(8);

  // Each dot responds to volume with a slight offset for visual variety
  const offset = Math.sin(index * 0.7) * 0.3;
  useEffect(() => {
    const target = 8 + (volume + offset) * 40;
    height.value = withSpring(Math.max(8, Math.min(48, target)), {
      damping: 12,
      stiffness: 180,
    });
  }, [volume]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#ffafcc",
    marginHorizontal: 2,
  }));

  return <Animated.View style={style} />;
}

export const RecordingSheet = forwardRef<BottomSheet, Props>(
  ({ onStop, onClose }, ref) => {
    const {
      state,
      transcript,
      volume,
      start,
      stop,
      cancel,
      append,
      error,
    } = useSpeechRecognition();

    const cancelScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);
    const micScale = useSharedValue(1);

    const cancelStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cancelScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));
    const micStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micScale.value }],
    }));

    // Start recognition when sheet opens
    const handleSheetChange = (index: number) => {
      if (index >= 0) {
        start();
      }
    };

    // Handle permission errors
    useEffect(() => {
      if (error === "permissions_denied") {
        Alert.alert(
          "Microphone Access Required",
          "ADHD Planner needs microphone access to add tasks by voice. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    }, [error]);

    const handleCancel = () => {
      cancel();
      onClose();
    };

    const handleConfirm = () => {
      stop();
      if (transcript.trim()) {
        onStop(transcript.trim());
      }
      // If empty, stay on sheet — do nothing
    };

    const handleMicPress = () => {
      if (state === "stopped" || state === "error") {
        append();
      }
    };

    const isListening = state === "listening";
    const showRetry =
      state === "error" && error !== "permissions_denied";

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        onClose={() => {
          cancel();
          onClose();
        }}
        onChange={handleSheetChange}
        backgroundStyle={{
          borderTopLeftRadius: 48,
          borderTopRightRadius: 48,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-[#1e2939]">
              {isListening ? "Listening..." : "Recording"}
            </Text>
            <Pressable onPress={handleCancel}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Spectrograph */}
          <View
            className="rounded-3xl overflow-hidden justify-center items-center"
            style={{
              height: 64,
              backgroundColor: "rgba(162,210,255,0.2)",
            }}
          >
            <View className="flex-row items-end" style={{ height: 48 }}>
              {Array.from({ length: DOT_COUNT }).map((_, i) => (
                <SpectroDot key={i} volume={volume} index={i} />
              ))}
            </View>
          </View>

          {/* Transcript display */}
          <View
            className="mt-4 min-h-[60px] rounded-2xl px-4 py-3"
            style={{ backgroundColor: "rgba(162,210,255,0.1)" }}
          >
            <Text
              className="text-base text-[#1e2939]"
              style={{ opacity: transcript ? 1 : 0.4 }}
            >
              {transcript || "Start speaking..."}
            </Text>
          </View>

          {/* Error / retry message */}
          {showRetry && (
            <Text className="text-sm text-[#f87171] mt-2 text-center">
              Couldn't catch that. Tap the mic to try again.
            </Text>
          )}

          {/* Buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-4">
            {/* Cancel */}
            <Animated.View style={cancelStyle}>
              <Pressable
                onPress={handleCancel}
                onPressIn={() => {
                  cancelScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  cancelScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="w-14 h-14 rounded-full items-center justify-center bg-[#ffc8dd]"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </Animated.View>

            {/* Mic (append/retry) — shown when stopped */}
            {!isListening && (
              <Animated.View style={micStyle}>
                <Pressable
                  onPress={handleMicPress}
                  onPressIn={() => {
                    micScale.value = withSpring(0.92, SPRING_BOUNCY);
                  }}
                  onPressOut={() => {
                    micScale.value = withSpring(1, SPRING_BOUNCY);
                  }}
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#a2d2ff" }}
                >
                  <Ionicons name="mic" size={24} color="#fff" />
                </Pressable>
              </Animated.View>
            )}

            {/* Confirm */}
            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => {
                  confirmScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  confirmScale.value = withSpring(1, SPRING_BOUNCY);
                }}
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "#bde0fe",
                  opacity: transcript.trim() ? 1 : 0.5,
                }}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
