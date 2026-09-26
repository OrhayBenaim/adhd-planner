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
  /** Called once per gesture, on release (and on tap), never per frame. */
  onChange: (value: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
}

export function MoodSlider({ value, onChange, onDraggingChange }: Props) {
  // Thumb and label are local while dragging; the mood commits on release.
  const [liveValue, setLiveValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLiveValue(value);
  }
  const label = getMoodLabel(liveValue);
  const [trackWidth, setTrackWidth] = useState(1);
  const isDraggingRef = useRef(false);
  // The value this slider just committed: the thumb is already there, so moving
  // it to the rounded value would snap it a few pixels after release.
  const releasedValueRef = useRef<number | null>(null);

  const thumbX = useSharedValue(valueToThumbX(value, trackWidth));

  const toValue = (x: number) =>
    Math.round(Math.min(Math.max(x / Math.max(1, trackWidth - THUMB_SIZE), 0), 1) * 100);

  const showLive = (x: number) => setLiveValue(toValue(x));

  const commit = (x: number) => {
    const next = toValue(x);
    releasedValueRef.current = next === value ? null : next;
    setLiveValue(next);
    onChange(next);
  };

  const setDragging = (dragging: boolean) => {
    isDraggingRef.current = dragging;
    onDraggingChange?.(dragging);
  };

  // One gesture for tap and drag, so each touch commits exactly once.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const max = Math.max(0, trackWidth - THUMB_SIZE);
      thumbX.value = clamp(e.x - THUMB_SIZE / 2, 0, max);
      scheduleOnRN(setDragging, true);
      scheduleOnRN(showLive, thumbX.value);
    })
    .onChange((e) => {
      const max = Math.max(0, trackWidth - THUMB_SIZE);
      thumbX.value = clamp(thumbX.value + e.changeX, 0, max);
      scheduleOnRN(showLive, thumbX.value);
    })
    .onFinalize(() => {
      scheduleOnRN(commit, thumbX.value);
      scheduleOnRN(setDragging, false);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  // Outside changes (widget, accessibility actions) move the thumb.
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (value === releasedValueRef.current) {
      releasedValueRef.current = null;
      return;
    }
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
      <GestureDetector gesture={pan}>
        <View
          accessible accessibilityRole="adjustable" accessibilityLabel="Energy level"
          accessibilityValue={{ min: 0, max: 100, now: liveValue, text: label }}
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
