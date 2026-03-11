import { useState } from "react";
import { View, Text, TextInput, Pressable, Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import * as Sentry from "@sentry/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { authClient } from "../../src/lib/authClient";

type SubView = "main" | "options" | "email";

export default function SignInStep() {
  const { state, submitOnboarding, isSubmitting } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  const busy = isSubmitting || isSigningIn;

  const handleSkip = async () => {
    await submitOnboarding();
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setIsSigningIn(true);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });
      if (error) {
        Sentry.captureMessage(`Social sign-in failed: ${error.message ?? "unknown"}`, "error");
        return;
      }
      await submitOnboarding();
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Sentry.captureMessage("Email auth attempted with missing fields", "info");
      return;
    }

    setIsSigningIn(true);
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: state.name.trim() || "",
        });
        if (error) {
          Sentry.captureMessage(`Sign-up failed: ${error.message ?? "unknown"}`, "error");
          return;
        }
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) {
          Sentry.captureMessage(`Email sign-in failed: ${error.message ?? "unknown"}`, "error");
          return;
        }
      }
      await submitOnboarding();
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Email form sub-view
  if (subView === "email") {
    return (
      <OnboardingLayout
        step={6}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-6">
              <Text className="text-3xl font-bold text-[#1e2939] text-center mb-3">
                {isSignUp ? "Create your account" : "Welcome back"}
              </Text>
              <Text className="text-lg text-[#4a5565] text-center">
                {isSignUp ? "Enter your details to get started" : "Sign in to your account"}
              </Text>
            </View>

            <View className="gap-3">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#99a1af"
                className="border border-[#e5e7eb] rounded-3xl px-5 py-5 text-lg text-[#1e2939]"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#99a1af"
                className="border border-[#e5e7eb] rounded-3xl px-5 py-5 text-lg text-[#1e2939]"
                secureTextEntry
              />
            </View>

            {/* Submit button */}
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                height: 56,
                borderRadius: 9999,
                marginTop: 24,
                opacity: busy ? 0.5 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 15,
                elevation: 6,
              }}
            >
              <Pressable
                onPress={handleEmailAuth}
                disabled={busy}
                className="flex-1 items-center justify-center"
              >
                <Text className="text-white font-semibold text-base">
                  {busy ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
                </Text>
              </Pressable>
            </LinearGradient>

            {/* Toggle sign-in / sign-up */}
            <View className="items-center mt-4">
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-base font-medium text-[#a2d2ff]">
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Back link */}
          <View className="items-center pb-6" style={{ paddingTop: 16 }}>
            <Pressable
              onPress={() => setSubView("options")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color="#6a7282" />
              <Text className="text-lg font-medium text-[#6a7282]">
                Back
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </OnboardingLayout>
    );
  }

  // Sign-in method options sub-view
  if (subView === "options") {
    return (
      <OnboardingLayout
        step={6}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <View className="flex-1">
          <View style={{ marginBottom: 32 }}>
            <Text className="text-3xl font-bold text-[#1e2939] text-center" style={{ marginBottom: 12, lineHeight: 36 }}>
              Choose your{"\n"}sign-in method
            </Text>
            <Text className="text-lg text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {/* Google (Android only) */}
            {Platform.OS === "android" && (
              <Pressable
                onPress={() => handleSocialSignIn("google")}
                disabled={busy}
                className="flex-row items-center bg-white"
                style={{
                  gap: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  opacity: busy ? 0.5 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text className="text-base font-medium text-[#364153]">
                  {isSigningIn ? "Signing in..." : "Sign in with Google"}
                </Text>
              </Pressable>
            )}

            {/* Apple (iOS only) */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => handleSocialSignIn("apple")}
                disabled={busy}
                className="flex-row items-center bg-white"
                style={{
                  gap: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  opacity: busy ? 0.5 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
                <Text className="text-base font-medium text-[#364153]">
                  {isSigningIn ? "Signing in..." : "Sign in with Apple"}
                </Text>
              </Pressable>
            )}

            {/* Email (always) */}
            <Pressable
              onPress={() => setSubView("email")}
              disabled={busy}
              className="flex-row items-center bg-white"
              style={{
                gap: 12,
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: "#e5e7eb",
                opacity: busy ? 0.5 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Ionicons name="mail-outline" size={24} color="#6a7282" />
              <Text className="text-base font-medium text-[#364153]">
                Sign in with Email
              </Text>
            </Pressable>
          </View>

          {/* Don't have an account? */}
          <View className="items-center" style={{ marginTop: 24 }}>
            <Text className="text-base text-[#6a7282]">
              Don't have an account?
            </Text>
            <Pressable onPress={() => { setIsSignUp(true); setSubView("email"); }}>
              <Text className="text-base font-semibold text-[#a2d2ff] underline mt-1">
                Sign up here
              </Text>
            </Pressable>
          </View>

          {/* Back link */}
          <View className="flex-1 justify-end items-center pb-6">
            <Pressable
              onPress={() => setSubView("main")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color="#6a7282" />
              <Text className="text-lg font-medium text-[#6a7282]">
                Back
              </Text>
            </Pressable>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Main view — "Save your progress"
  return (
    <OnboardingLayout
      step={6}
      onContinue={() => {}}
      continueEnabled={false}
      showFooter={false}
    >
      <View className="flex-1 items-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center" style={{ marginBottom: 32 }}>
          <Text className="text-6xl">☁️</Text>
        </View>

        {/* Cloud icon badge */}
        <LinearGradient
          colors={["#bde0fe", "#a2d2ff"]}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
          }}
        >
          <Ionicons name="cloud-outline" size={28} color="#fff" />
        </LinearGradient>

        <Text className="text-3xl font-bold text-[#1e2939] text-center mb-2">
          Save your progress ☁️
        </Text>
        <Text className="text-lg text-[#4a5565] text-center mb-10 px-4">
          Link an account to sync your data across devices and never lose your progress
        </Text>

        {/* Link Account button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 9999,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
          }}
        >
          <Pressable
            onPress={() => setSubView("options")}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              Link Account
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Skip button */}
        <Pressable onPress={handleSkip} disabled={busy}>
          <Text className="text-base font-medium text-[#6a7282]">
            {isSubmitting ? "Saving..." : "I'll do this later"}
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
