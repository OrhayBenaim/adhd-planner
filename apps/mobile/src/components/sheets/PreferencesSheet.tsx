import { forwardRef, useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { AppPressable } from "../AppPressable";
import { SegmentedControl } from "../SegmentedControl";
import { ChipGrid } from "../onboarding/ChipGrid";
import { usePreferences, useUpdatePreferences } from "../../hooks/usePreferences";
import { useHome } from "../home/HomeProvider";
import { PRODUCTIVE_TIMES, DIFFICULTIES, STRENGTHS } from "../../constants/onboarding";

const SEGMENTS = [
  { label: "Times", color: "#cdb4db" },
  { label: "Difficulties", color: "#ffafcc" },
  { label: "Strengths", color: "#a2d2ff" },
];

interface Props {
  onClose: () => void;
}

export const PreferencesSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const preferences = usePreferences();
    const updatePreferences = useUpdatePreferences();

    const [activeTab, setActiveTab] = useState(0);
    const [bestWorkTimes, setBestWorkTimes] = useState<string[]>([]);
    const [difficulties, setDifficulties] = useState<string[]>([]);
    const [strengths, setStrengths] = useState<string[]>([]);

    // Track what was last saved to avoid unnecessary mutations
    const savedRef = useRef({ bestWorkTimes: [] as string[], difficulties: [] as string[], strengths: [] as string[] });

    // Populate local state when preferences load
    useEffect(() => {
      if (preferences) {
        setBestWorkTimes(preferences.bestWorkTimes);
        setDifficulties(preferences.difficulties);
        setStrengths(preferences.strengths);
        savedRef.current = {
          bestWorkTimes: preferences.bestWorkTimes,
          difficulties: preferences.difficulties,
          strengths: preferences.strengths,
        };
      }
    }, [preferences]);

    // Auto-save: compare current state with saved state and patch if changed
    const autoSave = useCallback(() => {
      const saved = savedRef.current;
      const patch: Record<string, unknown> = {};

      if (JSON.stringify(bestWorkTimes) !== JSON.stringify(saved.bestWorkTimes))
        patch.bestWorkTimes = bestWorkTimes;
      if (JSON.stringify(difficulties) !== JSON.stringify(saved.difficulties))
        patch.difficulties = difficulties;
      if (JSON.stringify(strengths) !== JSON.stringify(saved.strengths))
        patch.strengths = strengths;

      if (Object.keys(patch).length > 0) {
        updatePreferences(patch);
        savedRef.current = { bestWorkTimes, difficulties, strengths };
      }
    }, [bestWorkTimes, difficulties, strengths, updatePreferences]);

    // Auto-save on tab switch
    const handleTabChange = useCallback(
      (index: number) => {
        autoSave();
        setActiveTab(index);
      },
      [autoSave]
    );

    // Auto-save on sheet close
    const handleClose = useCallback(() => {
      autoSave();
      onClose();
    }, [autoSave, onClose]);

    const toggleWorkTime = useCallback((label: string) => {
      setBestWorkTimes((prev) =>
        prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
      );
    }, []);

    const toggleDifficulty = useCallback((label: string) => {
      setDifficulties((prev) =>
        prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label]
      );
    }, []);

    const toggleStrength = useCallback((label: string) => {
      setStrengths((prev) =>
        prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
      );
    }, []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        onClose={handleClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <View className="px-6 pt-6 pb-3">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-medium text-[#1e2939]">My Preferences</Text>
            <AppPressable onPress={closeSheet}>
              <Ionicons name="close" size={24} color="#364153" />
            </AppPressable>
          </View>
          <SegmentedControl
            segments={SEGMENTS}
            activeIndex={activeTab}
            onPress={handleTabChange}
          />
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {activeTab === 0 && (
            <View className="pt-4 gap-3">
              {PRODUCTIVE_TIMES.map((time) => {
                const isSelected = bestWorkTimes.includes(time.label);
                return isSelected ? (
                  <Pressable key={time.id} onPress={() => toggleWorkTime(time.label)}>
                    <LinearGradient
                      colors={["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-3xl px-5 py-5"
                      style={{ borderWidth: 1.5, borderColor: "#a2d2ff" }}
                    >
                      <Text className="text-base font-medium text-[#1e2939]">
                        {time.label}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable
                    key={time.id}
                    onPress={() => toggleWorkTime(time.label)}
                    className="rounded-3xl px-5 py-5"
                    style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
                  >
                    <Text className="text-base font-medium text-[#364153]">
                      {time.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {activeTab === 1 && (
            <View className="pt-4">
              <ChipGrid
                items={DIFFICULTIES}
                selected={difficulties}
                onToggle={toggleDifficulty}
                variant="difficulties"
              />
            </View>
          )}

          {activeTab === 2 && (
            <View className="pt-4">
              <ChipGrid
                items={STRENGTHS}
                selected={strengths}
                onToggle={toggleStrength}
                variant="strengths"
              />
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
