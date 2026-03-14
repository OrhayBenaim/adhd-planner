import { forwardRef } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { useHome } from "../home/HomeProvider";
import { usePremium } from "../../hooks/usePremium";

interface Props {
  onClose: () => void;
}

const BAR_COLORS = ["#bde0fe", "#cdb4db", "#ffafcc", "#ffc8dd", "#bde0fe", "#cdb4db", "#ffafcc"];

function MiniBarChart({ data }: { data: Record<string, number> }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const max = Math.max(...last7.map((d) => data[d] ?? 0), 1);

  return (
    <View
      className="flex-row items-end justify-between gap-1 px-4"
      style={{ height: 120 }}
    >
      {last7.map((date, i) => {
        const count = data[date] ?? 0;
        const height = (count / max) * 80 + 4;
        const dayLabel = new Date(date + "T00:00:00Z").toLocaleDateString(
          "en-US",
          { weekday: "short" },
        );
        return (
          <View key={date} className="items-center flex-1">
            {count > 0 && (
              <Text className="text-xs font-semibold text-[#0a0a0a] mb-1">
                {count}
              </Text>
            )}
            <View
              style={{
                height,
                backgroundColor: count > 0 ? BAR_COLORS[i % BAR_COLORS.length] : "#e5e7eb",
                borderRadius: 6,
                width: "100%",
              }}
            />
            <Text className="text-xs text-[#6a7282] mt-1">{dayLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const InsightsSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const { isPremium } = usePremium();
    const report = useQuery(
      api.insights.getWeeklyReport,
      isPremium ? {} : "skip",
    );
    const trends = useQuery(
      api.insights.getCompletionTrends,
      isPremium ? { days: 7 } : "skip",
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["70%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="px-6 pt-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-lg font-medium text-[#0a0a0a]">
                Your Insights
              </Text>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>

            {/* This week + Last week row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-[#bde0fe]/20 rounded-2xl p-4">
                <Text className="text-2xl font-bold text-[#0a0a0a]">
                  {report?.tasksCompletedThisWeek ?? 0}
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  completed this week
                </Text>
              </View>

              <View className="flex-1 bg-[#cdb4db]/20 rounded-2xl p-4">
                <Text className="text-2xl font-bold text-[#0a0a0a]">
                  {report?.tasksCompletedLastWeek ?? 0}
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  completed last week
                </Text>
              </View>
            </View>

            {/* Best day + Streak row */}
            <View className="flex-row gap-3 mb-4">
              {/* Best day */}
              <View className="flex-1 bg-[#ffafcc]/20 rounded-2xl p-4">
                <Text className="text-xl font-bold text-[#0a0a0a]">
                  {report?.mostProductiveDay ?? "—"}
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  most productive day
                </Text>
              </View>

              {/* Streak */}
              <View className="flex-1 bg-[#ffc8dd]/20 rounded-2xl p-4">
                <Text className="text-xl font-bold text-[#0a0a0a]">
                  {report?.currentStreak ?? 0} days
                </Text>
                <Text className="text-sm text-[#6a7282] mt-1">
                  streak — best: {report?.longestStreak ?? 0}
                </Text>
              </View>
            </View>

            {/* Bar chart */}
            <Text className="text-sm font-medium text-[#0a0a0a] mb-3">
              This Week
            </Text>
            <View className="bg-[#f5f7fa] rounded-2xl py-4">
              <MiniBarChart data={trends ?? {}} />
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
