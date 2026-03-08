import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ProgressBar } from "./ProgressBar";

interface Props {
  step: number; // 1-based
  children: React.ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueEnabled: boolean;
  showFooter?: boolean; // default true, set false for notification/account steps
}

export function OnboardingLayout({
  step,
  children,
  onBack,
  onContinue,
  continueEnabled,
  showFooter = true,
}: Props) {
  return (
    <LinearGradient
      colors={["#ffc8dd", "#ffafcc", "#cdb4db"]}
      locations={[0, 0.5, 1]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 mx-4 my-5">
        <View className="flex-1 bg-white rounded-[48px] overflow-hidden shadow-2xl">
          {/* Progress bar */}
          <ProgressBar currentStep={step} />

          {/* Content area */}
          <View className="flex-1 px-6 pt-8">
            {children}
          </View>

          {/* Footer */}
          {showFooter && (
            <View className="border-t border-[#f3f4f6] px-6 py-6 flex-row items-center justify-between">
              {/* Back button */}
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  className="w-12 h-12 rounded-full bg-[#f3f4f6] items-center justify-center"
                >
                  <Ionicons name="chevron-back" size={24} color="#364153" />
                </Pressable>
              ) : (
                <View className="w-12 h-12 rounded-full bg-[#f3f4f6] items-center justify-center opacity-30">
                  <Ionicons name="chevron-back" size={24} color="#364153" />
                </View>
              )}

              {/* Continue button */}
              <LinearGradient
                colors={["#a2d2ff", "#cdb4db"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="flex-1 ml-4 h-14 rounded-3xl shadow-lg"
                style={{ opacity: continueEnabled ? 1 : 0.5 }}
              >
                <Pressable
                  onPress={onContinue}
                  disabled={!continueEnabled}
                  className="flex-1 flex-row items-center justify-center"
                >
                  <Text className="text-white font-semibold text-base mr-1">
                    Continue
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
              </LinearGradient>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
