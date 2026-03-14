import { View, Text, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppPressable as Pressable } from "../src/components/AppPressable";

export default function AchievementsPage() {
  const router = useRouter();
  const definitions = useQuery(api.achievementDefs.listDefinitions);
  const unlocked = useQuery(api.achievementDefs.listUnlocked);

  const unlockedIds = new Set(unlocked?.map((a) => a.achievementId) ?? []);
  const unlockedMap = new Map(
    unlocked?.map((a) => [a.achievementId, a]) ?? [],
  );

  const totalCount = definitions?.length ?? 0;
  const unlockedCount = unlockedIds.size;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Achievements",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
            </Pressable>
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f5f7fa" },
          headerTitleStyle: { color: "#0A0A0A", fontWeight: "600" },
        }}
      />
      <ScrollView
        className="flex-1 bg-[#f5f7fa]"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-6">
          {/* Completion summary */}
          <Text className="text-base font-medium text-[#6A7282] mb-6">
            {unlockedCount}/{totalCount} Achievements ({percentage}%)
          </Text>

          {/* Grid */}
          <View className="flex-row flex-wrap gap-3">
            {definitions?.map((def) => {
              const isUnlocked = unlockedIds.has(def.id);
              const achievement = unlockedMap.get(def.id);

              return (
                <View
                  key={def.id}
                  className="w-[48%] rounded-3xl overflow-hidden"
                  style={{ opacity: isUnlocked ? 1 : 0.5 }}
                >
                  {isUnlocked ? (
                    <LinearGradient
                      colors={["#a2d2ff", "#cdb4db"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 16, borderRadius: 24 }}
                    >
                      <AchievementContent
                        def={def}
                        isUnlocked
                        unlockedAt={achievement?.unlockedAt}
                      />
                    </LinearGradient>
                  ) : (
                    <View className="bg-[#e5e7eb] p-4 rounded-3xl">
                      <AchievementContent def={def} isUnlocked={false} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function AchievementContent({
  def,
  isUnlocked,
  unlockedAt,
}: {
  def: { icon: string; name: string; description: string };
  isUnlocked: boolean;
  unlockedAt?: number;
}) {
  const iconColor = isUnlocked ? "#fff" : "#9ca3af";
  const textColor = isUnlocked ? "text-white" : "text-[#6a7282]";
  const nameColor = isUnlocked ? "text-white" : "text-[#9ca3af]";

  return (
    <View className="items-center gap-2">
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{
          backgroundColor: isUnlocked
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.05)",
        }}
      >
        <Ionicons
          name={def.icon as any}
          size={24}
          color={iconColor}
        />
      </View>
      <Text className={`text-sm font-semibold ${nameColor} text-center`}>
        {def.name}
      </Text>
      <Text className={`text-[10px] ${textColor} text-center`}>
        {def.description}
      </Text>
      {isUnlocked && unlockedAt && (
        <Text className="text-[9px] text-white/60 text-center">
          {new Date(unlockedAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}
