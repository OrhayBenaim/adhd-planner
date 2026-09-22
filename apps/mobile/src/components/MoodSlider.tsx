import { View, Text, LayoutChangeEvent } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { getMoodLabel } from "../lib/moodLabels";
import { useEffect, useRef, useState } from "react";

import { homeColors, homeStyles } from "./home/theme";

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 11;

function valueToThumbX(value: number, trackWidth: number): number {
  const max = Math.max(0, trackWidth - THUMB_SIZE);
  return max > 0 ? (value / 100) * max : 0;
}

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function MoodSlider({ value, onChange }: Props) {
  const label = getMoodLabel(value);
  const [trackWidth, setTrackWidth] = useState(1);
  const isDraggingRef = useRef(false);

  const thumbX = useSharedValue(valueToThumbX(value, trackWidth));

  const notifyChange = (x: number) => {
    const pct = Math.min(Math.max(x / Math.max(1, trackWidth - THUMB_SIZE), 0), 1);
    onChange(Math.round(pct * 100));
  };

  const setDragging = (dragging: boolean) => {
    isDraggingRef.current = dragging;
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      scheduleOnRN(setDragging, true);
    })
    .onChange((e) => {
      const max = Math.max(0, trackWidth - THUMB_SIZE);
      thumbX.value = clamp(thumbX.value + e.changeX, 0, max);
      scheduleOnRN(notifyChange, thumbX.value);
    })
    .onFinalize(() => {
      scheduleOnRN(setDragging, false);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const max = Math.max(0, trackWidth - THUMB_SIZE);
    const x = clamp(e.x - THUMB_SIZE / 2, 0, max);
    thumbX.value = x;
    scheduleOnRN(notifyChange, x);
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  useEffect(() => {
    if (isDraggingRef.current) return;
    thumbX.value = valueToThumbX(value, trackWidth);
  }, [value, trackWidth, thumbX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    thumbX.value = valueToThumbX(value, w);
  };

  return (
    <View className="w-full">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Text style={[homeStyles.heading, { fontSize: 21, lineHeight: 26, flexShrink: 1 }]}>How are you feeling?</Text>
      <Animated.Text
        key={label}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={homeStyles.caption}
      >
        {label}
      </Animated.Text>
      </View>

      {/* Track + thumb */}
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View
          accessible accessibilityRole="adjustable" accessibilityLabel="Energy level"
          accessibilityValue={{ min: 0, max: 100, now: value, text: label }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={event => onChange(Math.max(0, Math.min(100, value + (event.nativeEvent.actionName === "increment" ? 10 : -10))))}
          style={{ height: 44, justifyContent: "center" }}
          onLayout={handleLayout}
        >
          {/* Gradient track with shadow */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: TRACK_HEIGHT,
              borderRadius: 9999,

            }}
          >
            <LinearGradient
              colors={["#a2d2ff", "#bde0fe", "#cdb4db", "#ffc8dd", "#ffafcc"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, borderRadius: 9999 }}
            />
          </View>

          {/* Thumb */}
          <Animated.View
            style={[
              thumbStyle,
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#ffffff",
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
              },
            ]}
          />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
        <Text style={[homeStyles.caption, { fontSize: 12, color: homeColors.muted }]}>Exhausted</Text>
        <Text style={[homeStyles.caption, { fontSize: 12, color: homeColors.muted }]}>Super motivated</Text>
      </View>
    </View>
  );
}
