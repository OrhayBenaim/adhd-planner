import { forwardRef } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { useHome } from "../home/HomeProvider";
import { usePremium } from "../../hooks/usePremium";
import { ProBadge } from "../ProBadge";

interface Props {
  onClose: () => void;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View className="flex-1 bg-[#f5f7fa] rounded-2xl p-3 items-center gap-1">
      <Ionicons name={icon} size={18} color="#a2d2ff" />
      <Text className="text-lg font-bold text-[#1e2939]">{value}</Text>
      <Text className="text-[10px] text-[#6a7282] text-center">{label}</Text>
    </View>
  );
}

function MiniBarChart({ data }: { data: Record<string, number> }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const max = Math.max(...last7.map((d) => data[d] ?? 0), 1);

  return (
    <View className="flex-row items-end justify-between gap-1 px-4" style={{ height: 100 }}>
      {last7.map((date) => {
        const count = data[date] ?? 0;
        const height = (count / max) * 80 + 4;
        const dayLabel = new Date(date + "T00:00:00Z")
          .toLocaleDateString("en-US", { weekday: "short" })
          .slice(0, 2);
        return (
          <View key={date} className="items-center flex-1">
            <View
              style={{
                height,
                backgroundColor: count > 0 ? "#a2d2ff" : "#e5e7eb",
                borderRadius: 6,
                width: "100%",
              }}
            />
            <Text className="text-[10px] text-[#6a7282] mt-1">{dayLabel}</Text>
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
    const report = useQuery(api.insights.getWeeklyReport, isPremium ? {} : "skip");
    const trends = useQuery(api.insights.getCompletionTrends, isPremium ? { days: 7 } : "skip");

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
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-medium text-[#1e2939]">
                  Progress Insights
                </Text>
                <ProBadge />
              </View>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>

            {/* Stats row */}
            <View className="flex-row gap-3 mb-6">
              <StatCard
                label="This Week"
                value={report?.tasksCompletedThisWeek ?? 0}
                icon="checkmark-circle-outline"
              />
              <StatCard
                label="Last Week"
                value={report?.tasksCompletedLastWeek ?? 0}
                icon="time-outline"
              />
              <StatCard
                label="Best Day"
                value={report?.mostProductiveDay?.slice(0, 3) ?? "—"}
                icon="calendar-outline"
              />
            </View>

            {/* Difficulty & Streak */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-[#f5f7fa] rounded-2xl p-3 flex-row items-center gap-3">
                <Ionicons name="fitness-outline" size={20} color="#cdb4db" />
                <View>
                  <Text className="text-sm font-semibold text-[#1e2939]">
                    Avg. Difficulty
                  </Text>
                  <Text className="text-xs text-[#6a7282]">
                    {report?.avgDifficulty ?? 0}/100
                  </Text>
                </View>
              </View>
              <View className="flex-1 bg-[#f5f7fa] rounded-2xl p-3 flex-row items-center gap-3">
                <Ionicons name="flame" size={20} color="#ff9f43" />
                <View>
                  <Text className="text-sm font-semibold text-[#1e2939]">
                    Streak
                  </Text>
                  <Text className="text-xs text-[#6a7282]">
                    {report?.currentStreak ?? 0} days (best:{" "}
                    {report?.longestStreak ?? 0})
                  </Text>
                </View>
              </View>
            </View>

            {/* Bar chart */}
            <Text className="text-sm font-medium text-[#1e2939] mb-3">
              Daily Completions
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
