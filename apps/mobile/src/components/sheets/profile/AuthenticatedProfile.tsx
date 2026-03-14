import { useState, useCallback } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { AppPressable as Pressable } from "../../AppPressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../../lib/authClient";
import { usePremium } from "../../../hooks/usePremium";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AuthenticatedProfileProps {
  session: { user?: SessionUser } | null;
  editName: string;
  onEditNameChange: (text: string) => void;
  onClose: () => void;
}

export function AuthenticatedProfile({
  session,
  editName,
  onEditNameChange,
  onClose,
}: AuthenticatedProfileProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const deleteAccountMutation = useMutation(api.account.deleteAccount);
  const [busy, setBusy] = useState(false);

  const getProviderBadge = () => {
    const image = session?.user?.image ?? "";
    const userEmail = session?.user?.email ?? "";
    if (image.includes("googleusercontent")) return "Google";
    if (userEmail.includes("privaterelay.appleid.com")) return "Apple";
    if (userEmail) return "Email";
    return null;
  };

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await authClient.signOut();
      onClose();
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setBusy(false);
    }
  }, [onClose]);

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
              onClose();
            } catch (e) {
              Sentry.captureException(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [deleteAccountMutation, onClose]);

  const provider = getProviderBadge();

  return (
    <View>
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
          onChangeText={onEditNameChange}
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
          maxLength={100}
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

      {/* Achievements (premium only) */}
      {isPremium && (
        <Pressable
          onPress={() => {
            onClose();
            setTimeout(() => router.push("/achievements"), 300);
          }}
          className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center mb-3"
          style={{ gap: 12 }}
        >
          <View className="w-10 h-10 rounded-full bg-[#cdb4db] items-center justify-center">
            <Ionicons name="trophy-outline" size={20} color="#fff" />
          </View>
          <Text className="text-sm font-medium text-[#1e2939]">Achievements</Text>
          <View className="flex-1" />
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>
      )}

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
        <Text className="text-sm font-medium text-[#1e2939]">Sign Out</Text>
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
}
