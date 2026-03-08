import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState, useCallback, type RefObject } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { XPBar } from "../src/components/XPBar";
import { MoodSlider } from "../src/components/MoodSlider";
import { TaskCard } from "../src/components/TaskCard";
import { BottomNav } from "../src/components/BottomNav";
import { PointsToast } from "../src/components/PointsToast";
import { AddTaskSheet } from "../src/components/sheets/AddTaskSheet";
import { RecordingSheet } from "../src/components/sheets/RecordingSheet";
import { SelectDaySheet } from "../src/components/sheets/SelectDaySheet";
import { SelectTimeSheet } from "../src/components/sheets/SelectTimeSheet";
import { AllTasksSheet } from "../src/components/sheets/AllTasksSheet";
import { SettingsSheet } from "../src/components/sheets/SettingsSheet";

import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "../src/hooks/useTasks";
import { useUserProgress } from "../src/hooks/useUserProgress";
import { useSettings } from "../src/hooks/useSettings";
import type { Task } from "@adhd-planner/types";

type ActiveSheet =
  | "none"
  | "addTask"
  | "recording"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings";

export default function HomeScreen() {
  const [moodLevel, setMoodLevel] = useState(50);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>("none");
  const [toast, setToast] = useState<{ points: number; visible: boolean }>({
    points: 0,
    visible: false,
  });

  // Task creation flow state
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  // AI button animation
  const aiScale = useSharedValue(1);
  const aiRotate = useSharedValue(0);

  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const { progress, addPoints } = useUserProgress();
  const { settings, updateSetting } = useSettings();

  // Sheet refs
  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);

  // Queues the next sheet to open after the current sheet's close animation finishes.
  // Prevents the race where onClose re-fires closeSheet and kills the newly opened sheet.
  const nextSheetRef = useRef<ActiveSheet | null>(null);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    setActiveSheet(sheet);
    if (sheet === "addTask") addSheetRef.current?.expand();
    if (sheet === "recording") recordingSheetRef.current?.expand();
    if (sheet === "selectDay") daySheetRef.current?.expand();
    if (sheet === "selectTime") timeSheetRef.current?.expand();
    if (sheet === "allTasks") allTasksSheetRef.current?.expand();
    if (sheet === "settings") settingsSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet("none");
    addSheetRef.current?.close();
    recordingSheetRef.current?.close();
    daySheetRef.current?.close();
    timeSheetRef.current?.close();
    allTasksSheetRef.current?.close();
    settingsSheetRef.current?.close();
  }, []);

  // onClose handler for sheets that may navigate to another sheet.
  // Called by the BottomSheet after its close animation completes (both gesture and programmatic).
  const onSheetClosed = useCallback((sheetRef: RefObject<BottomSheet>) => () => {
    const next = nextSheetRef.current;
    nextSheetRef.current = null;
    sheetRef.current?.close(); // no-op if already closed; covers swipe-to-dismiss path
    if (next) {
      openSheet(next);
    } else {
      setActiveSheet("none");
    }
  }, [openSheet]);

  // AI pick task
  const handleAIPick = useCallback(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    if (!incomplete.length) return;

    aiRotate.value = withSequence(
      withTiming(0.1, { duration: 100 }),
      withTiming(-0.1, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    aiScale.value = withSequence(
      withSpring(1.1, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );

    const best = incomplete.reduce((prev, curr) =>
      Math.abs(curr.difficulty - moodLevel) < Math.abs(prev.difficulty - moodLevel)
        ? curr
        : prev
    );
    setTimeout(() => setSelectedTask(best), 300);
  }, [tasks, moodLevel]);

  // Complete task
  const handleComplete = useCallback(
    async (task: Task) => {
      await completeTask.mutateAsync(task.id);
      const { earned } = await addPoints(task.difficulty);
      setSelectedTask(null);
      setToast({ points: earned, visible: true });
    },
    [completeTask, addPoints]
  );

  // Add task flow
  const handleTaskConfirmed = (title: string) => {
    setPendingTaskTitle(title);
    nextSheetRef.current = "selectDay";
    addSheetRef.current?.close();
    setActiveSheet("none");
  };

  const handleDaySelected = (day: string) => {
    if (day === "custom") {
      setShowCustomDay(true);
      return;
    }
    setSelectedDay(day);
    setShowCustomDay(false);
    nextSheetRef.current = "selectTime";
    daySheetRef.current?.close();
    setActiveSheet("none");
  };

  const handleTimeSelected = async (time: string) => {
    if (time === "custom") {
      setShowCustomTime(true);
      return;
    }
    closeSheet();
    await createTask.mutateAsync({
      title: pendingTaskTitle,
      difficulty: moodLevel,
      dueDate: selectedDay || undefined,
      dueTime: time,
    });
    setPendingTaskTitle("");
    setSelectedDay("");
  };

  const aiAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: aiScale.value },
      { rotate: `${aiRotate.value}rad` },
    ],
  }));

  return (
    <SafeAreaView className="flex-1 bg-[#f5f7fa]">
      <View className="flex-1 bg-[#f5f7fa]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center pt-8 pb-4 px-6">
            <Text className="text-2xl font-medium text-[#0a0a0a] text-center">How are you feeling?</Text>
            <Text className="text-sm text-[#6a7282] text-center mt-1">Let's find the perfect task for you</Text>
          </View>

          {/* XP bar */}
          <View className="py-6">
            <View className="relative">
              <XPBar progress={progress} />
              <PointsToast
                points={toast.points}
                visible={toast.visible}
                onDone={() => setToast((t) => ({ ...t, visible: false }))}
              />
            </View>
          </View>

          {/* Mood slider */}
          <View className="px-6 pt-2 pb-8">
            <MoodSlider value={moodLevel} onChange={setMoodLevel} />
          </View>

          {/* AI button */}
          <View className="items-center pb-6">
            <Animated.View style={aiAnimStyle}>
              <Pressable onPress={handleAIPick}>
                {/* Shadow layer — needs backgroundColor for iOS/Android shadow, no overflow:hidden */}
                <View style={{ width: 154, height: 154, borderRadius: 77, backgroundColor: "#b9cbea", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 }}>
                  {/* Clip layer — overflow:hidden clips gradient to circle on Android */}
                  <View style={{ width: 154, height: 154, borderRadius: 77, overflow: "hidden" }}>
                    <LinearGradient
                      colors={["#a2d2ff", "#cdb4db"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="sparkles-outline" size={58} color="#fff" />
                    </LinearGradient>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          {/* Task card */}
          <View className="px-6">
            <TaskCard
              task={selectedTask}
              onComplete={handleComplete}
              onLater={() => setSelectedTask(null)}
            />
          </View>
        </ScrollView>

        {/* Bottom nav */}
        <BottomNav
          onListPress={() => openSheet("allTasks")}
          onAddPress={() => openSheet("addTask")}
          onSettingsPress={() => openSheet("settings")}
        />
      </View>

      {/* Bottom sheets */}
      <AddTaskSheet
        ref={addSheetRef}
        onConfirm={handleTaskConfirmed}
        onMicPress={() => {
          nextSheetRef.current = "recording";
          addSheetRef.current?.close();
          setActiveSheet("none");
        }}
        onClose={onSheetClosed(addSheetRef)}
      />
      <RecordingSheet
        ref={recordingSheetRef}
        onStop={(text) => {
          if (text) setPendingTaskTitle(text);
          nextSheetRef.current = "selectDay";
          recordingSheetRef.current?.close();
          setActiveSheet("none");
        }}
        onClose={onSheetClosed(recordingSheetRef)}
      />
      <SelectDaySheet
        ref={daySheetRef}
        onSelect={handleDaySelected}
        onClose={onSheetClosed(daySheetRef)}
        customValue={customDay}
        onCustomChange={setCustomDay}
        showCustomInput={showCustomDay}
      />
      <SelectTimeSheet
        ref={timeSheetRef}
        onSelect={handleTimeSelected}
        onClose={closeSheet}
        customValue={customTime}
        onCustomChange={setCustomTime}
        showCustomInput={showCustomTime}
      />
      <AllTasksSheet
        ref={allTasksSheetRef}
        tasks={tasks}
        onEdit={() => {}}
        onDelete={(id) => deleteTask.mutate(id)}
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        settings={settings}
        onUpdate={updateSetting}
        onClose={closeSheet}
      />
    </SafeAreaView>
  );
}
