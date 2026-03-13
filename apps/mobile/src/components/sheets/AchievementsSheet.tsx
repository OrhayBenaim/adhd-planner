import { forwardRef } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { useHome } from "../home/HomeProvider";

interface Props {
  onClose: () => void;
}

export const AchievementsSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const definitions = useQuery(api.achievementDefs.listDefinitions);
    const unlocked = useQuery(api.achievementDefs.listUnlocked);

    const unlockedIds = new Set(unlocked?.map((a) => a.achievementId) ?? []);
    const unlockedMap = new Map(
      unlocked?.map((a) => [a.achievementId, a]) ?? [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["75%"]}
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
              <Text className="text-lg font-medium text-[#1e2939]">
                Achievements
              </Text>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>

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
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

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
