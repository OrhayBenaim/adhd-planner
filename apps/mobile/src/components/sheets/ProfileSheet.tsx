import { forwardRef, useState, useCallback, useEffect, useRef, type ComponentType } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { authClient } from "../../lib/authClient";
import { useSheetNav } from "../home/SheetNavProvider";
import { useRegisterRootBackContribution } from "../home/RootBackContribution";
import { usePreferences, useUpdatePreferences } from "../../hooks/usePreferences";
import { AnonymousProfile } from "./profile/AnonymousProfile";
import { AuthenticatedProfile } from "./profile/AuthenticatedProfile";
import { AuthFlow } from "../auth/AuthFlow";
import type { AuthFlowView } from "../../lib/authFlow";
import { getSessionAnonymousState } from "../../lib/sessionState";

type SubView = "main" | "linkOptions" | "signInOptions";

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

const SheetInput = BottomSheetTextInput as ComponentType<TextInputProps>;

export const ProfileSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useSheetNav();
    const { data: session } = authClient.useSession();
    const preferences = usePreferences();

    const [subView, setSubView] = useState<SubView>("main");
    const [authView, setAuthView] = useState<AuthFlowView>("options");
    const authBackRef = useRef<(() => void) | null>(null);
    const updatePreferences = useUpdatePreferences();
    const [editName, setEditName] = useState("");
    const [nameLoaded, setNameLoaded] = useState(false);

    const isAnonymous = getSessionAnonymousState(session);
    const userName = preferences?.name ?? session?.user?.name ?? "User";

    const profileToMain = useCallback(() => setSubView("main"), []);
    const authGoBack = useCallback(() => {
      authBackRef.current?.();
    }, []);

    useRegisterRootBackContribution("profile", {
      profileSubView: subView,
      profileAuthView: authView,
      authGoBack,
      profileToMain,
    });

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
      setAuthView("options");
    }, []);

    const handleAuthSuccess = useCallback(() => {
      resetState();
      closeSheet();
    }, [resetState, closeSheet]);

    const authHeader = useCallback(
      (backToMain: () => void) =>
        ({ view, onBack }: { view: "options" | "username"; onBack: () => void }) => {
          authBackRef.current = onBack;
          return (
            <SubViewHeader
              onBack={view === "options" ? backToMain : onBack}
              onClose={closeSheet}
            />
          );
        },
      [closeSheet],
    );

    let content;

    if (isAnonymous === undefined) {
      content = (
        <View className="px-6 pt-6">
          <MainHeader onClose={closeSheet} />
          <Text className="text-sm text-[#6a7282]">Loading profile...</Text>
        </View>
      );
    } else if (subView === "linkOptions" && isAnonymous) {
      content = (
        <View className="px-6 pt-6">
          <AuthFlow
            key="link"
            mode="link"
            onSuccess={handleAuthSuccess}
            onViewChange={setAuthView}
            presentation={{ usernameBack: "none", signUpName: userName }}
            InputComponent={SheetInput}
            renderHeader={authHeader(() => setSubView("main"))}
          />
        </View>
      );
    } else if (subView === "signInOptions" && isAnonymous) {
      content = (
        <View className="px-6 pt-6">
          <AuthFlow
            key="signIn"
            mode="signIn"
            onSuccess={handleAuthSuccess}
            onViewChange={setAuthView}
            presentation={{ usernameBack: "none" }}
            InputComponent={SheetInput}
            renderHeader={authHeader(() => setSubView("main"))}
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
