import { forwardRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { usePremium } from "../../hooks/usePremium";
import { useHome } from "../home/HomeProvider";
import type { PurchasesPackage } from "react-native-purchases";

const FEATURES = [
  { icon: "chatbubble-ellipses-outline" as const, text: "AI Coach \u2014 Personalized encouragement notifications" },
  { icon: "stats-chart-outline" as const, text: "Progress Insights \u2014 Weekly reports & trends" },
  { icon: "trophy-outline" as const, text: "Achievements \u2014 Badges, streaks & streak freeze" },
  { icon: "apps-outline" as const, text: "Home Widgets \u2014 Quick access from your home screen" },
  { icon: "sparkles-outline" as const, text: "More AI Scoring \u2014 Higher monthly AI limit" },
];

interface Props {
  onClose: () => void;
}

export const PaywallSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { offerings, purchase, restore, isLoading } = usePremium();
    const { closeSheet } = useHome();
    const [purchasing, setPurchasing] = useState(false);

    const monthly = offerings.find((p) => p.identifier?.includes("monthly"));
    const annual = offerings.find((p) => p.identifier?.includes("annual"));

    const handlePurchase = async (pkg: PurchasesPackage) => {
      setPurchasing(true);
      const success = await purchase(pkg);
      setPurchasing(false);
      if (success) closeSheet();
    };

    const handleRestore = async () => {
      setPurchasing(true);
      const success = await restore();
      setPurchasing(false);
      if (success) closeSheet();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["85%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="px-6 pt-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-[#1e2939]">
                Unlock Pro
              </Text>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>
            <Text className="text-sm text-[#6a7282] mb-6">
              Get the most out of your ADHD planner
            </Text>

            {/* Features */}
            <View className="mb-6">
              {FEATURES.map((f) => (
                <View
                  key={f.icon}
                  className="flex-row items-center gap-3 mb-3"
                >
                  <View className="w-8 h-8 rounded-full bg-[#a2d2ff]/20 items-center justify-center">
                    <Ionicons name={f.icon} size={16} color="#a2d2ff" />
                  </View>
                  <Text className="text-sm text-[#1e2939] flex-1">
                    {f.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Plans */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#a2d2ff" />
            ) : (
              <View className="gap-3 mb-6">
                {annual && (
                  <Pressable onPress={() => handlePurchase(annual)} disabled={purchasing}>
                    <LinearGradient
                      colors={["#a2d2ff", "#cdb4db"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 20, padding: 1 }}
                    >
                      <View className="bg-white rounded-[19px] px-5 py-4">
                        <View className="flex-row items-center justify-between">
                          <View>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-base font-semibold text-[#1e2939]">
                                Annual
                              </Text>
                              <View className="bg-[#a2d2ff]/20 rounded-full px-2 py-0.5">
                                <Text className="text-[10px] font-semibold text-[#a2d2ff]">
                                  Save 33%
                                </Text>
                              </View>
                            </View>
                            <Text className="text-xs text-[#6a7282] mt-0.5">
                              {annual.product.priceString}/year
                            </Text>
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#a2d2ff"
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                )}

                {monthly && (
                  <Pressable onPress={() => handlePurchase(monthly)} disabled={purchasing}>
                    <View className="bg-[#f5f7fa] rounded-[20px] px-5 py-4">
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-base font-semibold text-[#1e2939]">
                            Monthly
                          </Text>
                          <Text className="text-xs text-[#6a7282] mt-0.5">
                            {monthly.product.priceString}/month
                          </Text>
                        </View>
                        <Ionicons
                          name="ellipse-outline"
                          size={24}
                          color="#d1d5db"
                        />
                      </View>
                    </View>
                  </Pressable>
                )}
              </View>
            )}

            {/* Loading overlay */}
            {purchasing && (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#a2d2ff" />
              </View>
            )}

            {/* Restore */}
            <Pressable onPress={handleRestore} disabled={purchasing}>
              <Text className="text-center text-xs text-[#6a7282] underline">
                Restore Purchases
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
