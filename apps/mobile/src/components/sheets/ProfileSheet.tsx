import { forwardRef, useState, useCallback, useEffect } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { authClient } from "../../lib/authClient";
import { useSheetNav } from "../home/SheetNavProvider";
import { usePreferences, useUpdatePreferences } from "../../hooks/usePreferences";
import { AnonymousProfile } from "./profile/AnonymousProfile";
import { AuthenticatedProfile } from "./profile/AuthenticatedProfile";
import { AuthOptions } from "../auth/AuthOptions";
import { SignUpWithUsername } from "../auth/SignUpWithUsername";
import { SignInWithUsername } from "../auth/SignInWithUsername";
import { getSessionAnonymousState } from "../../lib/sessionState";

type SubView =
  | "main"
  | "linkOptions"
  | "signInOptions"
  | "signUpUsername"
  | "signInUsername";

function SubViewHeader({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-6">
      <Pressable
        onPress={onBack}
        className="flex-row items-center"
        style={{ gap: 6 }}
      >
        <Ionicons name="arrow-back" size={20} color="#6a7282" />
        <Text className="text-base font-medium text-[#6a7282]">Back</Text>
      </Pressable>
      <Pressable onPress={onClose}>
        <Ionicons name="close" size={24} color="#364153" />
      </Pressable>
    </View>
  );
}

function MainHeader({ onClose }: { onClose: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-6">
      <Text className="text-lg font-medium text-[#1e2939]">Profile</Text>
      <Pressable onPress={onClose}>
        <Ionicons name="close" size={24} color="#364153" />
      </Pressable>
    </View>
  );
}

interface Props {
  onClose: () => void;
}

export const ProfileSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useSheetNav();
    const { data: session } = authClient.useSession();
    const preferences = usePreferences();

    const [subView, setSubView] = useState<SubView>("main");
    const updatePreferences = useUpdatePreferences();
    const [editName, setEditName] = useState("");
    const [nameLoaded, setNameLoaded] = useState(false);

    const isAnonymous = getSessionAnonymousState(session);
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
    }, []);

    const handleAuthSuccess = useCallback(() => {
      resetState();
      closeSheet();
    }, [resetState, closeSheet]);

    let content;

    if (isAnonymous === undefined) {
      content = (
        <View className="px-6 pt-6">
          <MainHeader onClose={closeSheet} />
          <Text className="text-sm text-[#6a7282]">Loading profile...</Text>
        </View>
      );
    } else if (subView === "signUpUsername" && isAnonymous) {
      content = (
        <View className="px-6 pt-6">
          <SubViewHeader onBack={() => setSubView("linkOptions")} onClose={closeSheet} />
          <SignUpWithUsername
            onSuccess={handleAuthSuccess}
            name={userName}
            onSwitchToSignIn={() => setSubView("signInOptions")}
            InputComponent={BottomSheetTextInput as any}
          />
        </View>
      );
    } else if (subView === "signInUsername" && isAnonymous) {
      content = (
        <View className="px-6 pt-6">
          <SubViewHeader onBack={() => setSubView("signInOptions")} onClose={closeSheet} />
          <SignInWithUsername
            onSuccess={handleAuthSuccess}
            InputComponent={BottomSheetTextInput as any}
          />
        </View>
      );
    } else if (subView === "linkOptions") {
      content = (
        <View className="px-6 pt-6">
          <SubViewHeader onBack={() => setSubView("main")} onClose={closeSheet} />
          <AuthOptions
            mode="link"
            onSuccess={handleAuthSuccess}
            onUsernamePress={() => setSubView("signUpUsername")}
          />
        </View>
      );
    } else if (subView === "signInOptions") {
      content = (
        <View className="px-6 pt-6">
          <SubViewHeader onBack={() => setSubView("main")} onClose={closeSheet} />
          <AuthOptions
            mode="signIn"
            onSuccess={handleAuthSuccess}
            onUsernamePress={() => setSubView("signInUsername")}
          />
        </View>
      );
    } else if (isAnonymous) {
      content = (
        <View className="px-6 pt-6">
          <MainHeader onClose={closeSheet} />
          <AnonymousProfile
            userName={userName}
            editName={editName}
            onEditNameChange={setEditName}
            onLinkPress={() => setSubView("linkOptions")}
            onSignInPress={() => setSubView("signInOptions")}
          />
        </View>
      );
    } else {
      content = (
        <View className="px-6 pt-6">
          <MainHeader onClose={closeSheet} />
          <AuthenticatedProfile
            session={session}
            editName={editName}
            onEditNameChange={setEditName}
            onClose={closeSheet}
          />
        </View>
      );
    }

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
          {content}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
