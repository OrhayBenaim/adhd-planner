import { forwardRef, useEffect, useRef, useState, useCallback } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { SPRING_BOUNCY } from "../../animations/springs";
import { useSheetFlow, type PendingTask } from "../home/SheetFlowProvider";
import { splitTranscription } from "../../lib/taskSplitter";
import { getLocales } from "react-native-localize";

let nextId = 0;
function genId() {
  return `pending-${++nextId}`;
}

function getDeviceLocale(): string {
  try {
    const locales = getLocales();
    return locales[0]?.languageCode ?? "en";
  } catch {
    return "en";
  }
}

interface Props {
  onClose: () => void;
}

/* -- WhatsApp-style scrolling waveform ----------------------------------- */

const BAR_W = 3;
const BAR_GAP = 1.5;
const BAR_STEP = BAR_W + BAR_GAP;
const MIN_H = 4;
const MAX_H = 40;

interface Bar {
  id: number;
  v: number;
}

function ScrollingWaveform({ volume }: { volume: number }) {
  const [bars, setBars] = useState<Bar[]>([]);
  const volumeRef = useRef(volume);
  const idRef = useRef(0);
  const maxBars = useRef(50);

  volumeRef.current = volume;

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      maxBars.current = Math.floor(e.nativeEvent.layout.width / BAR_STEP);
    },
    [],
  );

  // Start scrolling immediately on mount
  useEffect(() => {
    const interval = setInterval(() => {
      const v = volumeRef.current;
      const value = v > 0.05 ? v : 0.15 + Math.random() * 0.2;
      const id = idRef.current++;
      setBars((prev) => {
        const next = [...prev, { id, v: value }];
        return next.length > maxBars.current
          ? next.slice(-maxBars.current)
          : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        paddingHorizontal: 8,
      }}
      onLayout={onLayout}
    >
      {bars.map((bar) => (
        <View
          key={bar.id}
          style={{
            width: BAR_W,
            height: MIN_H + bar.v * (MAX_H - MIN_H),
            borderRadius: BAR_W / 2,
            backgroundColor: "#ffafcc",
            opacity: 0.7,
            marginHorizontal: BAR_GAP / 2,
          }}
        />
      ))}
    </View>
  );
}

/* -- RecordingSheet ------------------------------------------------------- */

export const RecordingSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const {
      transcript,
      volume,
      start,
      stop,
      cancel,
    } = useSpeechRecognition();
    const flow = useSheetFlow();

    const stopScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);

    const stopStyle = useAnimatedStyle(() => ({
      transform: [{ scale: stopScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));

    // Start recognition when sheet opens
    const handleSheetChange = (index: number) => {
      if (index >= 0) {
        start();
      }
    };

    const handleStop = () => {
      cancel();
      flow.reset();
    };

    const handleConfirm = () => {
      stop();
      const text = transcript.trim();
      if (!text) return;

      const locale = getDeviceLocale();
      const splitTasks = splitTranscription(text, locale);

      if (splitTasks.length <= 1) {
        flow.setTitle(splitTasks[0] || text);
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
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%"]}
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
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">
              Add New Task
            </Text>
            <Pressable onPress={handleStop}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Transcript display (textarea area) */}
          <View
            className="min-h-[128px] rounded-3xl px-4 py-4 mb-6"
            style={{ borderWidth: 1.1, borderColor: "#e5e7eb" }}
          >
            <Text
              className="text-base leading-6"
              style={{
                color: transcript ? "#1e2939" : "#99a1af",
              }}
            >
              {transcript || "Describe your task..."}
            </Text>
          </View>

          {/* Bottom row: [Spectrograph pill] [X stop] [Check confirm] */}
          <View className="flex-row items-center gap-4">
            {/* Spectrograph pill */}
            <View className="flex-1">
              <LinearGradient
                colors={["rgba(162,210,255,0.2)", "rgba(205,180,219,0.2)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  height: 64,
                  borderRadius: 9999,
                  flexDirection: "row",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <ScrollingWaveform volume={volume} />
              </LinearGradient>
            </View>

            {/* X stop button */}
            <Animated.View style={stopStyle}>
              <Pressable
                onPress={handleStop}
                onPressIn={() => {
                  stopScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  stopScale.value = withSpring(1, SPRING_BOUNCY);
                }}
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
                  <Ionicons name="close" size={28} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Check confirm button */}
            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => {
                  confirmScale.value = withSpring(0.92, SPRING_BOUNCY);
                }}
                onPressOut={() => {
                  confirmScale.value = withSpring(1, SPRING_BOUNCY);
                }}
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
                    opacity: transcript.trim() ? 1 : 0.5,
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
