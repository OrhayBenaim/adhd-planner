import { useState, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { AppPressable as Pressable } from "../src/components/AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinkAccountOptions } from "../src/components/auth/LinkAccountOptions";
import { SignUpWithEmail } from "../src/components/auth/SignUpWithEmail";
import { SignInWithEmail } from "../src/components/auth/SignInWithEmail";

type GateView = "options" | "signUp" | "signIn";

export default function SignInGateScreen() {
  const [view, setView] = useState<GateView>("options");

  const handleAuthSuccess = useCallback(() => {
    // After signing in, go straight to paywall
    router.replace("/paywall");
  }, []);

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Close button */}
        <View className="flex-row justify-end pt-14">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#364153" />
          </Pressable>
        </View>

        {/* Header */}
        <View className="items-center pt-6 pb-8">
          <View className="w-16 h-16 rounded-full bg-[#a2d2ff] items-center justify-center mb-4">
            <Ionicons name="lock-open-outline" size={32} color="#fff" />
          </View>
          <Text className="text-2xl font-semibold text-[#1e2939] text-center mb-2">
            Sign in to unlock
          </Text>
          <Text className="text-sm text-[#6a7282] text-center px-6">
            Create an account or sign in to access premium features and make purchases
          </Text>
        </View>

        {/* Auth forms */}
        <View className="px-2">
          {view === "options" && (
            <LinkAccountOptions
              onSuccess={handleAuthSuccess}
              onEmailPress={() => setView("signUp")}
            />
          )}
          {view === "signUp" && (
            <SignUpWithEmail
              onSuccess={handleAuthSuccess}
              title="Create your account"
              subtitle="Sign up to unlock premium features"
              onSwitchToSignIn={() => setView("signIn")}
            />
          )}
          {view === "signIn" && (
            <SignInWithEmail
              onSuccess={handleAuthSuccess}
              title="Welcome back"
              subtitle="Sign in to your existing account"
              onSwitchToSignUp={() => setView("signUp")}
            />
          )}
        </View>

        {/* Back to options link when in email view */}
        {view !== "options" && (
          <View className="items-center mt-6">
            <Pressable onPress={() => setView("options")}>
              <Text className="text-sm text-[#6a7282]">
                Back to sign-in options
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
