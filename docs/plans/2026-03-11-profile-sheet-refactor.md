# ProfileSheet Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract shared auth components from ProfileSheet and onboarding sign-in, reducing ProfileSheet from 660+ lines to a thin shell.

**Architecture:** Shared auth primitives (`components/auth/`) used by both ProfileSheet and onboarding. ProfileSheet-specific views (`sheets/profile/`). ProfileSheet becomes a routing shell with name editing state.

**Tech Stack:** React Native, Expo, @gorhom/bottom-sheet, better-auth, Convex, Sentry, NativeWind

---

### Task 1: Create SocialAuthButtons

**Files:**
- Create: `apps/mobile/src/components/auth/SocialAuthButtons.tsx`

**Step 1: Create the component**

Pure UI component — platform-aware Google/Apple/Email buttons. Uses `AppPressable` for sound support.

```tsx
import { View, Text, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface SocialAuthButtonsProps {
  onSocial: (provider: "google" | "apple") => void;
  onEmail: () => void;
  busy: boolean;
}

export function SocialAuthButtons({
  onSocial,
  onEmail,
  busy,
}: SocialAuthButtonsProps) {
  return (
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
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/SocialAuthButtons.tsx
git commit -m "feat: extract SocialAuthButtons shared component"
```

---

### Task 2: Create EmailForm

**Files:**
- Create: `apps/mobile/src/components/auth/EmailForm.tsx`

**Step 1: Create the component**

Pure UI — email + password inputs + gradient submit button. Accepts `InputComponent` prop so ProfileSheet can pass `BottomSheetTextInput` while onboarding uses the default `TextInput`.

```tsx
import { View, Text, TextInput, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentType } from "react";

interface EmailFormProps {
  email: string;
  onEmailChange: (text: string) => void;
  password: string;
  onPasswordChange: (text: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  InputComponent?: ComponentType<TextInputProps>;
}

export function EmailForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSubmit,
  submitLabel,
  busy,
  InputComponent = TextInput,
}: EmailFormProps) {
  const Input = InputComponent;
  return (
    <View>
      <View style={{ gap: 12 }}>
        <Input
          value={email}
          onChangeText={onEmailChange}
          placeholder="Email"
          placeholderTextColor="#99a1af"
          className="border border-[#e5e7eb] rounded-3xl px-5 py-4 text-base text-[#1e2939]"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          value={password}
          onChangeText={onPasswordChange}
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
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/EmailForm.tsx
git commit -m "feat: extract EmailForm shared component"
```

---

### Task 3: Create SignUpWithEmail

**Files:**
- Create: `apps/mobile/src/components/auth/SignUpWithEmail.tsx`

**Step 1: Create the component**

Owns email/password state + `authClient.signUp.email` handler. Renders title, subtitle, EmailForm, and optional toggle link.

```tsx
import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { EmailForm } from "./EmailForm";
import type { ComponentType } from "react";

interface SignUpWithEmailProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  name?: string;
  onSwitchToSignIn?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
}

export function SignUpWithEmail({
  onSuccess,
  onBeforeAuth,
  name,
  onSwitchToSignIn,
  InputComponent,
}: SignUpWithEmailProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      await onBeforeAuth?.();
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name ?? "",
      });
      if (error) {
        Sentry.captureMessage(
          `Sign-up failed: ${error.message ?? "unknown"}`,
          "error",
        );
        return;
      }
      onSuccess();
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setBusy(false);
    }
  }, [email, password, name, onBeforeAuth, onSuccess]);

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Create your account
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Your data will be preserved
      </Text>
      <EmailForm
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitLabel="Sign Up"
        busy={busy}
        InputComponent={InputComponent}
      />
      {onSwitchToSignIn && (
        <View className="items-center mt-4">
          <Pressable onPress={onSwitchToSignIn}>
            <Text className="text-sm font-medium text-[#a2d2ff]">
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/SignUpWithEmail.tsx
git commit -m "feat: extract SignUpWithEmail auth component"
```

---

### Task 4: Create SignInWithEmail

**Files:**
- Create: `apps/mobile/src/components/auth/SignInWithEmail.tsx`

**Step 1: Create the component**

Owns email/password state + `authClient.signIn.email` handler. Same structure as SignUpWithEmail.

```tsx
import { useState, useCallback } from "react";
import { View, Text, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { EmailForm } from "./EmailForm";
import type { ComponentType } from "react";

interface SignInWithEmailProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onSwitchToSignUp?: () => void;
  InputComponent?: ComponentType<TextInputProps>;
}

export function SignInWithEmail({
  onSuccess,
  onBeforeAuth,
  onSwitchToSignUp,
  InputComponent,
}: SignInWithEmailProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      await onBeforeAuth?.();
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
      onSuccess();
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setBusy(false);
    }
  }, [email, password, onBeforeAuth, onSuccess]);

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Sign in
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Sign in to your existing account
      </Text>
      <EmailForm
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitLabel="Sign In"
        busy={busy}
        InputComponent={InputComponent}
      />
      {onSwitchToSignUp && (
        <View className="items-center mt-4">
          <Pressable onPress={onSwitchToSignUp}>
            <Text className="text-sm font-medium text-[#a2d2ff]">
              Don't have an account? Sign up
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/SignInWithEmail.tsx
git commit -m "feat: extract SignInWithEmail auth component"
```

---

### Task 5: Create LinkAccountOptions

**Files:**
- Create: `apps/mobile/src/components/auth/LinkAccountOptions.tsx`

**Step 1: Create the component**

Owns social auth handler for the "link account" flow. Renders title + SocialAuthButtons.

```tsx
import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { SocialAuthButtons } from "./SocialAuthButtons";

interface LinkAccountOptionsProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onEmailPress: () => void;
}

export function LinkAccountOptions({
  onSuccess,
  onBeforeAuth,
  onEmailPress,
}: LinkAccountOptionsProps) {
  const [busy, setBusy] = useState(false);

  const handleSocial = useCallback(
    async (provider: "google" | "apple") => {
      setBusy(true);
      try {
        await onBeforeAuth?.();
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
        onSuccess();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    },
    [onBeforeAuth, onSuccess],
  );

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Link an account
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Your tasks and progress will be preserved
      </Text>
      <SocialAuthButtons
        onSocial={handleSocial}
        onEmail={onEmailPress}
        busy={busy}
      />
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/LinkAccountOptions.tsx
git commit -m "feat: extract LinkAccountOptions auth component"
```

---

### Task 6: Create SignInOptions

**Files:**
- Create: `apps/mobile/src/components/auth/SignInOptions.tsx`

**Step 1: Create the component**

Owns social auth handler for the "sign in" flow. Same structure as LinkAccountOptions with different labels.

```tsx
import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import * as Sentry from "@sentry/react-native";
import { authClient } from "../../lib/authClient";
import { SocialAuthButtons } from "./SocialAuthButtons";

interface SignInOptionsProps {
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onEmailPress: () => void;
}

export function SignInOptions({
  onSuccess,
  onBeforeAuth,
  onEmailPress,
}: SignInOptionsProps) {
  const [busy, setBusy] = useState(false);

  const handleSocial = useCallback(
    async (provider: "google" | "apple") => {
      setBusy(true);
      try {
        await onBeforeAuth?.();
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
        onSuccess();
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setBusy(false);
      }
    },
    [onBeforeAuth, onSuccess],
  );

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">
        Sign in
      </Text>
      <Text className="text-sm text-[#6a7282] mb-6">
        Sign in to your existing account
      </Text>
      <SocialAuthButtons
        onSocial={handleSocial}
        onEmail={onEmailPress}
        busy={busy}
      />
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/auth/SignInOptions.tsx
git commit -m "feat: extract SignInOptions auth component"
```

---

### Task 7: Create AnonymousProfile

**Files:**
- Create: `apps/mobile/src/components/sheets/profile/AnonymousProfile.tsx`

**Step 1: Create the component**

Main view for anonymous users — avatar, name input, benefit message, link CTA, sign-in link.

```tsx
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../../AppPressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";

interface AnonymousProfileProps {
  userName: string;
  editName: string;
  onEditNameChange: (text: string) => void;
  onLinkPress: () => void;
  onSignInPress: () => void;
}

export function AnonymousProfile({
  userName,
  editName,
  onEditNameChange,
  onLinkPress,
  onSignInPress,
}: AnonymousProfileProps) {
  return (
    <View>
      {/* Avatar + Name */}
      <View className="items-center mb-4">
        <View className="w-20 h-20 rounded-full bg-[#bde0fe] items-center justify-center mb-3">
          <Text className="text-2xl font-semibold text-white">
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <BottomSheetTextInput
          value={editName}
          onChangeText={onEditNameChange}
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
          Link an account to keep your data safe across devices and never lose
          your progress
        </Text>
      </View>

      {/* Link Account button */}
      <LinearGradient
        colors={["#a2d2ff", "#cdb4db"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ height: 52, borderRadius: 9999, marginBottom: 12 }}
      >
        <Pressable
          onPress={onLinkPress}
          className="flex-1 items-center justify-center"
        >
          <Text className="text-white font-semibold text-base">
            Link Account
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Sign In link */}
      <View className="items-center">
        <Pressable onPress={onSignInPress}>
          <Text className="text-base font-medium text-[#a2d2ff]">
            Already have an account? Sign in
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/AnonymousProfile.tsx
git commit -m "feat: extract AnonymousProfile component"
```

---

### Task 8: Create AuthenticatedProfile

**Files:**
- Create: `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx`

**Step 1: Create the component**

Main view for authenticated users — avatar/photo, name, email, provider badge, sign out, delete account. Owns sign-out and delete handlers.

```tsx
import { useState, useCallback } from "react";
import { View, Text, Image, Alert } from "react-native";
import { AppPressable as Pressable } from "../../AppPressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../../lib/authClient";

interface AuthenticatedProfileProps {
  session: any;
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
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx
git commit -m "feat: extract AuthenticatedProfile component"
```

---

### Task 9: Simplify ProfileSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/ProfileSheet.tsx` (full rewrite)

**Step 1: Rewrite ProfileSheet as thin shell**

Replace the entire file. ProfileSheet now only handles: BottomSheet wrapper, sub-view routing, name editing state, and delegates all UI to extracted components.

Sub-view types change from `"main" | "linkOptions" | "signInOptions" | "email"` to `"main" | "linkOptions" | "signInOptions" | "signUpEmail" | "signInEmail"` (separate email sub-views instead of one with `isSignUp` toggle).

```tsx
import { forwardRef, useState, useCallback, useEffect } from "react";
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../../lib/authClient";
import { useHome } from "../home/HomeProvider";
import { useUpdatePreferences } from "../../hooks/usePreferences";
import { AnonymousProfile } from "./profile/AnonymousProfile";
import { AuthenticatedProfile } from "./profile/AuthenticatedProfile";
import { LinkAccountOptions } from "../auth/LinkAccountOptions";
import { SignInOptions } from "../auth/SignInOptions";
import { SignUpWithEmail } from "../auth/SignUpWithEmail";
import { SignInWithEmail } from "../auth/SignInWithEmail";

type SubView =
  | "main"
  | "linkOptions"
  | "signInOptions"
  | "signUpEmail"
  | "signInEmail";

interface Props {
  onClose: () => void;
}

export const ProfileSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { closeSheet } = useHome();
    const { data: session } = authClient.useSession();
    const preferences = useQuery(api.preferences.get);

    const [subView, setSubView] = useState<SubView>("main");
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
    }, []);

    const handleAuthSuccess = useCallback(() => {
      resetState();
      closeSheet();
    }, [resetState, closeSheet]);

    const renderHeader = (onBack: () => void) => (
      <View className="flex-row items-center justify-between mb-6">
        <Pressable
          onPress={onBack}
          className="flex-row items-center"
          style={{ gap: 6 }}
        >
          <Ionicons name="arrow-back" size={20} color="#6a7282" />
          <Text className="text-base font-medium text-[#6a7282]">Back</Text>
        </Pressable>
        <Pressable onPress={closeSheet}>
          <Ionicons name="close" size={24} color="#364153" />
        </Pressable>
      </View>
    );

    const renderMainHeader = () => (
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-lg font-medium text-[#1e2939]">Profile</Text>
        <Pressable onPress={closeSheet}>
          <Ionicons name="close" size={24} color="#364153" />
        </Pressable>
      </View>
    );

    const renderContent = () => {
      if (subView === "signUpEmail" && isAnonymous) {
        return (
          <View className="px-6 pt-6">
            {renderHeader(() => setSubView("linkOptions"))}
            <SignUpWithEmail
              onSuccess={handleAuthSuccess}
              name={userName}
              onSwitchToSignIn={() => setSubView("signInOptions")}
              InputComponent={BottomSheetTextInput as any}
            />
          </View>
        );
      }

      if (subView === "signInEmail" && isAnonymous) {
        return (
          <View className="px-6 pt-6">
            {renderHeader(() => setSubView("signInOptions"))}
            <SignInWithEmail
              onSuccess={handleAuthSuccess}
              InputComponent={BottomSheetTextInput as any}
            />
          </View>
        );
      }

      if (subView === "linkOptions") {
        return (
          <View className="px-6 pt-6">
            {renderHeader(() => setSubView("main"))}
            <LinkAccountOptions
              onSuccess={handleAuthSuccess}
              onEmailPress={() => setSubView("signUpEmail")}
            />
          </View>
        );
      }

      if (subView === "signInOptions") {
        return (
          <View className="px-6 pt-6">
            {renderHeader(() => setSubView("main"))}
            <SignInOptions
              onSuccess={handleAuthSuccess}
              onEmailPress={() => setSubView("signInEmail")}
            />
          </View>
        );
      }

      // Main view
      if (isAnonymous) {
        return (
          <View className="px-6 pt-6">
            {renderMainHeader()}
            <AnonymousProfile
              userName={userName}
              editName={editName}
              onEditNameChange={setEditName}
              onLinkPress={() => setSubView("linkOptions")}
              onSignInPress={() => setSubView("signInOptions")}
            />
          </View>
        );
      }

      return (
        <View className="px-6 pt-6">
          {renderMainHeader()}
          <AuthenticatedProfile
            session={session}
            editName={editName}
            onEditNameChange={setEditName}
            onClose={closeSheet}
          />
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
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/ProfileSheet.tsx
git commit -m "refactor: simplify ProfileSheet to thin routing shell"
```

---

### Task 10: Update onboarding sign-in to use shared components

**Files:**
- Modify: `apps/mobile/app/(onboarding)/sign-in.tsx` (rewrite)

**Step 1: Rewrite sign-in.tsx**

Replace duplicated auth UI with shared components. Keeps its own main view (cloud pitch + skip), options view layout (custom titles + "Sign up here" link), and back navigation. Uses `SocialAuthButtons` for the options view and `SignUpWithEmail`/`SignInWithEmail` for email forms.

The social auth handler stays in this file because the options view uses `SocialAuthButtons` directly (not `LinkAccountOptions`) due to its unique layout/titles. The handler calls `saveOnboardingData()` before auth.

Sub-view types change from `"main" | "options" | "email"` to `"main" | "options" | "signUpEmail" | "signInEmail"`.

```tsx
import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { authClient } from "../../src/lib/authClient";
import { SocialAuthButtons } from "../../src/components/auth/SocialAuthButtons";
import { SignUpWithEmail } from "../../src/components/auth/SignUpWithEmail";
import { SignInWithEmail } from "../../src/components/auth/SignInWithEmail";

type SubView = "main" | "options" | "signUpEmail" | "signInEmail";

export default function SignInStep() {
  const { state, submitOnboarding, saveOnboardingData, isSubmitting } =
    useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");
  const [socialBusy, setSocialBusy] = useState(false);

  const busy = isSubmitting || socialBusy;

  const handleSkip = async () => {
    await submitOnboarding();
  };

  const handleSocialSignIn = useCallback(
    async (provider: "google" | "apple") => {
      setSocialBusy(true);
      try {
        await saveOnboardingData();
        const { error } = await authClient.signIn.social({
          provider,
          callbackURL: "/",
        });
        if (error) {
          Sentry.captureMessage(
            `Social sign-in failed: ${error.message ?? "unknown"}`,
            "error",
          );
          return;
        }
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setSocialBusy(false);
      }
    },
    [saveOnboardingData],
  );

  // Email form sub-views
  if (subView === "signUpEmail" || subView === "signInEmail") {
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
            {subView === "signUpEmail" ? (
              <SignUpWithEmail
                onSuccess={() => {}}
                onBeforeAuth={saveOnboardingData}
                name={state.name.trim() || ""}
                onSwitchToSignIn={() => setSubView("signInEmail")}
              />
            ) : (
              <SignInWithEmail
                onSuccess={() => {}}
                onBeforeAuth={saveOnboardingData}
                onSwitchToSignUp={() => setSubView("signUpEmail")}
              />
            )}
          </ScrollView>

          {/* Back link */}
          <View className="items-center pb-6" style={{ paddingTop: 16 }}>
            <Pressable
              onPress={() => setSubView("options")}
              className="flex-row items-center justify-center h-14"
              style={{ gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color="#6a7282" />
              <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
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
            <Text
              className="text-3xl font-bold text-[#1e2939] text-center"
              style={{ marginBottom: 12, lineHeight: 36 }}
            >
              Choose your{"\n"}sign-in method
            </Text>
            <Text className="text-lg text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <SocialAuthButtons
            onSocial={handleSocialSignIn}
            onEmail={() => setSubView("signUpEmail")}
            busy={busy}
          />

          {/* Don't have an account? */}
          <View className="items-center" style={{ marginTop: 24 }}>
            <Text className="text-base text-[#6a7282]">
              Don't have an account?
            </Text>
            <Pressable onPress={() => setSubView("signUpEmail")}>
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
              <Text className="text-lg font-medium text-[#6a7282]">Back</Text>
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
        <View
          className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center"
          style={{ marginBottom: 32 }}
        >
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
          Link an account to sync your data across devices and never lose your
          progress
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
```

**Step 2: Commit**

```bash
git add apps/mobile/app/(onboarding)/sign-in.tsx
git commit -m "refactor: use shared auth components in onboarding sign-in"
```

---

### Task 11: Typecheck and final commit

**Step 1: Run TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No errors. If there are type errors, fix them.

**Step 2: Verify all files exist**

```bash
ls -la src/components/auth/
ls -la src/components/sheets/profile/
```

Expected:
- `auth/`: SocialAuthButtons.tsx, EmailForm.tsx, SignUpWithEmail.tsx, SignInWithEmail.tsx, LinkAccountOptions.tsx, SignInOptions.tsx
- `profile/`: AnonymousProfile.tsx, AuthenticatedProfile.tsx

**Step 3: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: resolve typecheck errors from refactor"
```
