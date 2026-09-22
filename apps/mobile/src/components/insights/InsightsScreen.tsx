// apps/mobile/src/components/insights/InsightsScreen.tsx
import { useCallback } from "react";
import { BackHandler, Platform, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

import { BottomNav } from "../BottomNav";
import { HomeHeader } from "../home/HomeHeader";
import { homeColors, homeStyles } from "../home/theme";
import { useSheetNav } from "../home/SheetNavProvider";
import { useTaskCreationFlow } from "../home/TaskCreationFlowProvider";
import { useQueryTime } from "../../hooks/useQueryTime";
import { getUtcDateString } from "../../lib/dateTimeConvert";

const CHART_HEIGHT = 122;

// Bars are coloured by position, not by value: the day labels and the counts
// carry the meaning, so the sweep is decoration. No two neighbours repeat.
const BAR_COLORS = [
  homeColors.lavender, homeColors.mint, homeColors.primary, homeColors.accent,
  homeColors.lavender, homeColors.primary, homeColors.mint,
];

function Stat({ value, label, big, tint }: { value: string; label: string; big?: boolean; tint: string }) {
  return <View style={[homeStyles.card, { flex: 1, padding: 16, gap: 4, backgroundColor: tint }]}>
    <Text numberOfLines={1} style={{ fontFamily: "Nunito-ExtraBold", fontSize: big ? 28 : 20,
      lineHeight: big ? 34 : 26, color: homeColors.ink }}>{value}</Text>
    <Text style={homeStyles.caption}>{label}</Text>
  </View>;
}

function WeeklyChart({ trends }: { trends: Record<string, number> }) {
  // Server keys completion trends by UTC date, so chart keys must be UTC too.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    return getUtcDateString(date);
  });
  const max = Math.max(...last7.map((date) => trends[date] ?? 0), 1);

  return <View style={[homeStyles.card, { padding: 16, gap: 14, backgroundColor: homeColors.white }]}>
    <Text style={homeStyles.eyebrow}>THIS WEEK</Text>
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      {last7.map((date, i) => {
        const count = trends[date] ?? 0;
        const label = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short" });
        return <View key={date} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, lineHeight: 15,
            color: homeColors.ink }}>{count > 0 ? count : " "}</Text>
          {/* An empty day keeps a stub bar so the row still reads as seven days. */}
          <View style={{ width: "100%", borderRadius: 8, height: count > 0 ? (count / max) * CHART_HEIGHT : 12,
            backgroundColor: count > 0 ? BAR_COLORS[i] : homeColors.selected }} />
          <Text style={{ fontFamily: "Inter-Regular", fontSize: 12, lineHeight: 15,
            color: homeColors.body }}>{label}</Text>
        </View>;
      })}
    </View>
  </View>;
}

/** Insights: weekly stats and the 7-day completion chart (Figma 289:1517). */
export function InsightsScreen() {
  const router = useRouter();
  const { closeSheet, isSheetOpen } = useSheetNav();
  const flow = useTaskCreationFlow();
  const nowMs = useQueryTime();
  const report = useQuery(api.insights.getWeeklyReport, { nowMs });
  const trends = useQuery(api.insights.getCompletionTrends, { days: 7, nowMs });

  // Android back closes an open sheet first; otherwise it pops back to Today.
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isSheetOpen()) return false;
      closeSheet();
      return true;
    });
    return () => sub.remove();
  }, [isSheetOpen, closeSheet]));

  // navigate (not push) so switching tabs pops back to a screen already in the
  // stack instead of stacking Today on top of Insights on top of Today.
  const goTab = useCallback((href: "/" | "/plan") => {
    closeSheet();
    router.navigate(href);
  }, [closeSheet, router]);

  return <View style={{ flex: 1, backgroundColor: "white" }}>
    <HomeHeader title="Insights" onSettings={() => router.push("/settings")} />
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 }}>
      <Text style={homeStyles.body}>How your week went.</Text>
      <View style={{ flexDirection: "row", gap: 11 }}>
        <Stat big tint={homeColors.blue} value={String(report?.tasksCompletedThisWeek ?? 0)} label="completed this week" />
        <Stat big tint={homeColors.selected} value={String(report?.tasksCompletedLastWeek ?? 0)} label="completed last week" />
      </View>
      <View style={{ flexDirection: "row", gap: 11 }}>
        <Stat tint={homeColors.selected} value={report?.mostProductiveDay ?? "—"} label="most productive day" />
        <Stat tint={homeColors.blue} value={`${report?.currentStreak ?? 0} days`} label={`streak · best ${report?.longestStreak ?? 0}`} />
      </View>
      <WeeklyChart trends={trends ?? {}} />
    </ScrollView>
    <BottomNav active="insights" onTodayPress={() => goTab("/")} onListPress={() => goTab("/plan")}
      onInsightsPress={() => {}} onAddPress={() => flow.start()} />
  </View>;
}
