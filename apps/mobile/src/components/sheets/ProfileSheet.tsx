import { forwardRef, useState, useCallback, useEffect } from "react";
import { View, Text, Image, Alert, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../lib/authClient";
import { useHome } from "../home/HomeProvider";
import { useUpdatePreferences } from "../../hooks/usePreferences";

type SubView = "main" | "linkOptions" | "signInOptions" | "email";

interface Props {
  onClose: () => void;
}

export const ProfileSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const { data: session } = authClient.useSession();
    const preferences = useQuery(api.preferences.get);
    const deleteAccountMutation = useMutation(api.account.deleteAccount);

    const [subView, setSubView] = useState<SubView>("main");
    const [busy, setBusy] = useState(false);

    // Email form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(true);

    const updatePreferences = useUpdatePreferences();
    const [editName, setEditName] = useState("");
    const [nameLoaded, setNameLoaded] = useState(false);

    const isAnonymous = (session?.user as any)?.isAnonymous ?? true;
    const userName = preferences?.name ?? session?.user?.name ?? "User";

    useEffect(() => {
      if (preferences?.name && !nameLoaded) {
        setEditName(preferences.name);
        setNameLoaded(true);
      }
    }, [preferences, nameLoaded]);

    const saveName = useCallback(() => {
      const trimmed = editName.trim();
      if (trimmed && trimmed !== (preferences?.name ?? "")) {
        updatePreferences({ name: trimmed });
      }
    }, [editName, preferences, updatePreferences]);

    const resetState = useCallback(() => {
      setSubView("main");
      setEmail("");
      setPassword("");
      setIsSignUp(true);
      setBusy(false);
    }, []);

    // --- Link Account (keeps anonymous data, migrates via onLinkAccount) ---
    const handleLinkSocial = useCallback(
      async (provider: "google" | "apple") => {
        setBusy(true);
        try {
          const { error } = await authClient.signIn.social({
            provider,
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(
              `Link account failed: ${error.message ?? "unknown"}`,
              "error",
            );
            return;
          }
          resetState();
          closeSheet();
        } catch (e) {
          Sentry.captureException(e);
        } finally {
          setBusy(false);
        }
      },
      [closeSheet, resetState],
    );

    const handleLinkEmail = useCallback(async () => {
      if (!email.trim() || !password.trim()) return;
      setBusy(true);
      try {
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: userName,
        });
        if (error) {
          Sentry.captureMessage(
            `Link email failed: ${error.message ?? "unknown"}`,
            "error",
          );
          return;
        }
        resetState();
        closeSheet();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    }, [email, password, userName, closeSheet, resetState]);

    // --- Sign In (discards anonymous data, signs into existing account) ---
    const handleSignInSocial = useCallback(
      async (provider: "google" | "apple") => {
        setBusy(true);
        try {
          // Sign out anonymous session first to discard data
          await authClient.signOut();
          const { error } = await authClient.signIn.social({
            provider,
            callbackURL: "/",
          });
          if (error) {
            Sentry.captureMessage(
              `Sign-in failed: ${error.message ?? "unknown"}`,
              "error",
            );
            return;
          }
          resetState();
          closeSheet();
        } catch (e) {
          Sentry.captureException(e);
        } finally {
          setBusy(false);
        }
      },
      [closeSheet, resetState],
    );

    const handleSignInEmail = useCallback(async () => {
      if (!email.trim() || !password.trim()) return;
      setBusy(true);
      try {
        // Sign out anonymous session first to discard data
        await authClient.signOut();
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) {
          Sentry.captureMessage(
            `Email sign-in failed: ${error.message ?? "unknown"}`,
            "error",
          );
          return;
        }
        resetState();
        closeSheet();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    }, [email, password, closeSheet, resetState]);

    // --- Authenticated actions ---
    const handleSignOut = useCallback(async () => {
      setBusy(true);
      try {
        await authClient.signOut();
        closeSheet();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    }, [closeSheet]);

    const handleDeleteAccount = useCallback(() => {
      Alert.alert(
        "Delete Account",
        "This will permanently delete all your data including tasks, settings, and progress. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setBusy(true);
              try {
                await deleteAccountMutation();
                await authClient.signOut();
                closeSheet();
              } catch (e) {
                Sentry.captureException(e);
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    }, [deleteAccountMutation, closeSheet]);

    // --- Provider badge helper ---
    const getProviderBadge = () => {
      const image = session?.user?.image ?? "";
      const userEmail = session?.user?.email ?? "";
      if (image.includes("googleusercontent")) return "Google";
      if (userEmail.includes("privaterelay.appleid.com")) return "Apple";
      if (userEmail) return "Email";
      return null;
    };

    // --- Render helpers ---

    const renderSocialButtons = (
      onSocial: (p: "google" | "apple") => void,
      onEmail: () => void,
    ) => (
      <View style={{ gap: 12 }}>
        {Platform.OS === "android" && (
          <Pressable
            onPress={() => onSocial("google")}
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
            }}
          >
            <Ionicons name="logo-google" size={24} color="#4285F4" />
            <Text className="text-base font-medium text-[#364153]">
              {busy ? "Please wait..." : "Continue with Google"}
            </Text>
          </Pressable>
        )}
        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => onSocial("apple")}
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
            }}
          >
            <Ionicons name="logo-apple" size={24} color="#000" />
            <Text className="text-base font-medium text-[#364153]">
              {busy ? "Please wait..." : "Continue with Apple"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onEmail}
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
          }}
        >
          <Ionicons name="mail-outline" size={24} color="#6a7282" />
          <Text className="text-base font-medium text-[#364153]">
            Continue with Email
          </Text>
        </Pressable>
      </View>
    );

    const renderEmailForm = (onSubmit: () => void, submitLabel: string) => (
      <View>
        <View style={{ gap: 12 }}>
          <BottomSheetTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#99a1af"
            className="border border-[#e5e7eb] rounded-3xl px-5 py-4 text-base text-[#1e2939]"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <BottomSheetTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#99a1af"
            className="border border-[#e5e7eb] rounded-3xl px-5 py-4 text-base text-[#1e2939]"
            secureTextEntry
          />
        </View>
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            height: 52,
            borderRadius: 9999,
            marginTop: 20,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              {busy ? "Please wait..." : submitLabel}
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    );

    // --- Sub-views ---

    const renderContent = () => {
      // Email form for linking (sign-up) or signing in
      if (subView === "email" && isAnonymous) {
        const isLinkFlow = isSignUp;
        return (
          <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={() =>
                  setSubView(isLinkFlow ? "linkOptions" : "signInOptions")
                }
                className="flex-row items-center"
                style={{ gap: 6 }}
              >
                <Ionicons name="arrow-back" size={20} color="#6a7282" />
                <Text className="text-base font-medium text-[#6a7282]">
                  Back
                </Text>
              </Pressable>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>
            <Text className="text-xl font-semibold text-[#1e2939] mb-2">
              {isLinkFlow ? "Create your account" : "Sign in"}
            </Text>
            <Text className="text-sm text-[#6a7282] mb-6">
              {isLinkFlow
                ? "Your data will be preserved"
                : "Sign in to your existing account"}
            </Text>
            {renderEmailForm(
              isLinkFlow ? handleLinkEmail : handleSignInEmail,
              isLinkFlow ? "Sign Up" : "Sign In",
            )}
            {isLinkFlow && (
              <View className="items-center mt-4">
                <Pressable
                  onPress={() => {
                    setIsSignUp(false);
                    setSubView("signInOptions");
                  }}
                >
                  <Text className="text-sm font-medium text-[#a2d2ff]">
                    Already have an account? Sign in
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }

      // Link Account options (keeps data)
      if (subView === "linkOptions") {
        return (
          <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={() => setSubView("main")}
                className="flex-row items-center"
                style={{ gap: 6 }}
              >
                <Ionicons name="arrow-back" size={20} color="#6a7282" />
                <Text className="text-base font-medium text-[#6a7282]">
                  Back
                </Text>
              </Pressable>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>
            <Text className="text-xl font-semibold text-[#1e2939] mb-2">
              Link an account
            </Text>
            <Text className="text-sm text-[#6a7282] mb-6">
              Your tasks and progress will be preserved
            </Text>
            {renderSocialButtons(handleLinkSocial, () => {
              setIsSignUp(true);
              setSubView("email");
            })}
          </View>
        );
      }

      // Sign In options (discards anonymous data)
      if (subView === "signInOptions") {
        return (
          <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={() => setSubView("main")}
                className="flex-row items-center"
                style={{ gap: 6 }}
              >
                <Ionicons name="arrow-back" size={20} color="#6a7282" />
                <Text className="text-base font-medium text-[#6a7282]">
                  Back
                </Text>
              </Pressable>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>
            <Text className="text-xl font-semibold text-[#1e2939] mb-2">
              Sign in
            </Text>
            <Text className="text-sm text-[#6a7282] mb-6">
              Sign in to your existing account
            </Text>
            {renderSocialButtons(handleSignInSocial, () => {
              setIsSignUp(false);
              setSubView("email");
            })}
          </View>
        );
      }

      // --- Main view ---

      // Anonymous user
      if (isAnonymous) {
        return (
          <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-medium text-[#1e2939]">
                Profile
              </Text>
              <Pressable onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#364153" />
              </Pressable>
            </View>

            {/* Name */}
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-[#bde0fe] items-center justify-center mb-3">
                <Text className="text-2xl font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <BottomSheetTextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: "#1e2939",
                  textAlign: "center",
                  minWidth: 120,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb",
                }}
              />
            </View>

            {/* Benefit message */}
            <View className="bg-[#f5f7fa] rounded-3xl p-4 mb-6">
              <Text className="text-sm text-[#4a5565] text-center">
                Link an account to keep your data safe across devices and never
                lose your progress
              </Text>
            </View>

            {/* Link Account button */}
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                height: 52,
                borderRadius: 9999,
                marginBottom: 12,
              }}
            >
              <Pressable
                onPress={() => setSubView("linkOptions")}
                className="flex-1 items-center justify-center"
              >
                <Text className="text-white font-semibold text-base">
                  Link Account
                </Text>
              </Pressable>
            </LinearGradient>

            {/* Sign In link */}
            <View className="items-center">
              <Pressable onPress={() => setSubView("signInOptions")}>
                <Text className="text-base font-medium text-[#a2d2ff]">
                  Already have an account? Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        );
      }

      // Authenticated user
      const provider = getProviderBadge();

      return (
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-medium text-[#1e2939]">Profile</Text>
            <Pressable onPress={closeSheet}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          {/* Profile info */}
          <View className="items-center mb-6">
            {session?.user?.image ? (
              <Image
                source={{ uri: session.user.image }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                className="mb-3"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-[#bde0fe] items-center justify-center mb-3">
                <Text className="text-2xl font-semibold text-white">
                  {(session?.user?.name ?? "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <BottomSheetTextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: "#1e2939",
                textAlign: "center",
                minWidth: 120,
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            />
            {session?.user?.email && (
              <Text className="text-sm text-[#6a7282] mt-1">
                {session.user.email}
              </Text>
            )}
            {provider && (
              <View className="bg-[#f5f7fa] rounded-full px-3 py-1 mt-2">
                <Text className="text-xs text-[#6a7282]">
                  Signed in with {provider}
                </Text>
              </View>
            )}
          </View>

          {/* Sign Out */}
          <Pressable
            onPress={handleSignOut}
            disabled={busy}
            className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center mb-3"
            style={{ gap: 12, opacity: busy ? 0.5 : 1 }}
          >
            <View className="w-10 h-10 rounded-full bg-[#a2d2ff] items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </View>
            <Text className="text-sm font-medium text-[#1e2939]">
              Sign Out
            </Text>
          </Pressable>

          {/* Delete Account */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={busy}
            className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center"
            style={{ gap: 12, opacity: busy ? 0.5 : 1 }}
          >
            <View className="w-10 h-10 rounded-full bg-[#ff6b6b] items-center justify-center">
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </View>
            <View>
              <Text className="text-sm font-medium text-[#ff6b6b]">
                Delete Account
              </Text>
              <Text className="text-xs text-[#6a7282]">
                Permanently delete all data
              </Text>
            </View>
          </Pressable>
        </View>
      );
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%"]}
        enablePanDownToClose
        onClose={() => {
          saveName();
          resetState();
          onClose();
        }}
        backgroundStyle={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {renderContent()}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
