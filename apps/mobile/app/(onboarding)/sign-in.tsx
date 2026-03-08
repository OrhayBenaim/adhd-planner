import { useState } from "react";
import { View, Text, TextInput, Pressable, Platform, Alert, KeyboardAvoidingView, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { authClient } from "../../src/lib/authClient";

type SubView = "main" | "options" | "email";

export default function SignInStep() {
  const { submitOnboarding, isSubmitting } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        Alert.alert("Sign-in failed", error.message ?? "Please try again.");
        return;
      }
      await submitOnboarding();
    } catch (e) {
      Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setIsSigningIn(true);
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || "",
        });
        if (error) {
          Alert.alert("Sign-up failed", error.message ?? "Please try again.");
          return;
        }
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) {
          Alert.alert("Sign-in failed", error.message ?? "Please try again.");
          return;
        }
      }
      await submitOnboarding();
    } catch (e) {
      Alert.alert("Authentication failed", "Something went wrong. Please try again.");
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
              <Text className="text-2xl font-bold text-[#1e2939] text-center mb-3">
                {isSignUp ? "Create your account" : "Welcome back"}
              </Text>
              <Text className="text-base text-[#4a5565] text-center">
                {isSignUp ? "Enter your details to get started" : "Sign in to your account"}
              </Text>
            </View>

            <View className="gap-3">
              {isSignUp && (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name (optional)"
                  placeholderTextColor="#99a1af"
                  className="border border-[#e5e7eb] rounded-3xl px-4 py-4 text-base text-[#1e2939]"
                  autoCapitalize="words"
                />
              )}

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#99a1af"
                className="border border-[#e5e7eb] rounded-3xl px-4 py-4 text-base text-[#1e2939]"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#99a1af"
                className="border border-[#e5e7eb] rounded-3xl px-4 py-4 text-base text-[#1e2939]"
                secureTextEntry
              />
            </View>

            {/* Submit button */}
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              className="h-14 rounded-3xl shadow-lg mt-6"
              style={{ opacity: busy ? 0.5 : 1 }}
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
              <Text className="text-sm text-[#6a7282]">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
              </Text>
              <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-sm font-semibold text-[#a2d2ff] underline mt-1">
                  {isSignUp ? "Sign in instead" : "Create an account"}
                </Text>
              </Pressable>
            </View>

            {/* Back link */}
            <View className="items-center mt-6 pb-6">
              <Pressable
                onPress={() => setSubView("options")}
                className="h-14 items-center justify-center"
              >
                <Text className="text-base font-medium text-[#6a7282]">
                  ← Back
                </Text>
              </Pressable>
            </View>
          </ScrollView>
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
          <View className="mb-8">
            <Text className="text-2xl font-bold text-[#1e2939] text-center mb-3">
              Choose your sign-in method
            </Text>
            <Text className="text-base text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <View className="gap-3">
            {/* Google (Android only) */}
            {Platform.OS === "android" && (
              <Pressable
                onPress={() => handleSocialSignIn("google")}
                disabled={busy}
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
                style={{ opacity: busy ? 0.5 : 1 }}
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
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
                style={{ opacity: busy ? 0.5 : 1 }}
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
              className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
            >
              <Ionicons name="mail-outline" size={24} color="#6a7282" />
              <Text className="text-base font-medium text-[#364153]">
                Sign in with Email
              </Text>
            </Pressable>
          </View>

          {/* Back link */}
          <View className="flex-1 justify-end items-center pb-6">
            <Pressable
              onPress={() => setSubView("main")}
              className="h-14 items-center justify-center"
            >
              <Text className="text-base font-medium text-[#6a7282]">
                ← Back
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
      <View className="flex-1 items-center justify-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center mb-4">
          <Text className="text-6xl">☁️</Text>
        </View>

        {/* Cloud icon badge */}
        <LinearGradient
          colors={["#bde0fe", "#a2d2ff"]}
          className="w-20 h-20 rounded-full items-center justify-center shadow-lg -mt-12 mb-6"
        >
          <Ionicons name="cloud" size={40} color="#fff" />
        </LinearGradient>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Save your progress ☁️
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10 px-4">
          Link an account to sync your data across devices and never lose your progress
        </Text>

        {/* Link Account button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="w-full h-14 rounded-3xl shadow-lg mb-4"
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
