import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { SettingsGroup, SettingsRow } from "../../../src/components/settings/SettingsRow";
import { OnboardingAuth } from "../../../src/components/onboarding/OnboardingAuth";
import { settingsColors as colors, settingsStyles as styles } from "../../../src/components/settings/theme";
import { authClient } from "../../../src/lib/authClient";
import { clearHadLinkedAccountMarker, getSessionAnonymousState, markHadLinkedAccount } from "../../../src/lib/sessionState";
import { isInternalAuthEmail } from "../../../src/lib/authUsername";
import { usePreferences, useUpdatePreferences } from "../../../src/hooks/usePreferences";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
}

/** How the account was created, for the pill under the name. */
function describeProvider(user: SessionUser | undefined): string | null {
  if (!user) return null;
  const email = user.email ?? "";
  const handle = user.displayUsername ?? user.username;
  if ((user.image ?? "").includes("googleusercontent")) return email ? `Signed in with Google · ${email}` : "Signed in with Google";
  if (email.includes("privaterelay.appleid.com")) return "Signed in with Apple";
  if (handle) return `Signed in with username · @${handle}`;
  if (email && !isInternalAuthEmail(email)) return `Signed in with email · ${email}`;
  return null;
}

export default function ProfileAccountRoute() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const deleteAccount = useMutation(api.account.deleteAccount);

  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [auth, setAuth] = useState<"link" | "signIn" | null>(null);
  const [busy, setBusy] = useState(false);

  const isAnonymous = getSessionAnonymousState(session);
  const savedName = preferences?.name ?? session?.user?.name ?? "";

  useEffect(() => {
    if (!loaded && savedName) {
      setName(savedName);
      setLoaded(true);
    }
  }, [loaded, savedName]);

  const saveName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== savedName) updatePreferences({ name: trimmed });
  }, [name, savedName, updatePreferences]);

  const latestSaveName = useRef(saveName);
  latestSaveName.current = saveName;
  useEffect(() => () => latestSaveName.current(), []);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    try {
      // Clear the marker first: once the session is gone the (app) layout unmounts
      // this screen and routes to onboarding itself, so nothing here may run after.
      await clearHadLinkedAccountMarker();
      const { error } = await authClient.signOut();
      if (error) throw error;
    } catch (e) {
      Sentry.captureException(e);
      await markHadLinkedAccount().catch(Sentry.captureException);
      setBusy(false);
    }
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete account",
      "This will permanently delete all your data including tasks, settings, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          setBusy(true);
          try {
            await deleteAccount();
            await Promise.all([authClient.deleteUser(), clearHadLinkedAccountMarker()]);
            router.replace("/");
          } catch (e) {
            Sentry.captureException(e);
          } finally {
            setBusy(false);
          }
        } },
      ],
    );
  }, [deleteAccount, router]);

  if (auth) {
    return (
      <SettingsPage parent="Account" onLeave={() => setAuth(null)}>
        <OnboardingAuth mode={auth} name={name} onBack={() => setAuth(null)} onSuccess={() => setAuth(null)} />
      </SettingsPage>
    );
  }

  const provider = isAnonymous ? null : describeProvider(session?.user);

  return (
    <SettingsPage parent="Account" title="Profile & account" onLeave={saveName}
      explanation="Your name, how you sign in, and what happens to your data."
      note="Tap your name to edit it. Changes save when you go back.">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>YOUR NAME</Text>
        <TextInput value={name} onChangeText={setName} onBlur={saveName}
          placeholder="Your name" placeholderTextColor={colors.muted} maxLength={100}
          accessibilityLabel="Your name" style={[styles.cardValue, { padding: 0 }]} />
        {provider ? <View style={styles.cardPill}><Text style={styles.cardPillLabel}
          textBreakStrategy="simple" lineBreakStrategyIOS="standard">{provider}</Text></View> : null}
      </View>

      <SettingsGroup>
        <SettingsRow label="Achievements" description="Badges you have earned"
          onPress={() => router.push("/settings/achievements")} />
        {isAnonymous
          ? <SettingsRow label="Create an account" description="Keep your progress across devices"
              onPress={() => setAuth("link")} />
          : <SettingsRow label="Sign out" disabled={busy} onPress={handleSignOut} />}
        {isAnonymous
          ? <SettingsRow label="Sign in" description="Already have an account?" onPress={() => setAuth("signIn")} />
          : <SettingsRow label="Delete account" description="Permanently delete all data"
              destructive disabled={busy} onPress={handleDelete} />}
      </SettingsGroup>
    </SettingsPage>
  );
}
