import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { SettingsRow, SettingsSection } from "../../../src/components/settings/SettingsRow";
import { useSettings } from "../../../src/hooks/useSettings";

export default function SettingsPageRoute() {
  const router = useRouter();
  const { settings, updateSetting, adminAiEnabled } = useSettings();

  return (
    <SettingsPage animated screenName="Settings">
      <SettingsSection title="Account">
        <SettingsRow label="Profile & account" description="Your details, sign-in & data"
          onPress={() => router.push("/settings/profile")} />
        <SettingsRow label="Subscription" onPress={() => router.push("/settings/subscription")} />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow label="Best work times" onPress={() => router.push("/settings/work-times")} />
        <SettingsRow label="Difficulties" onPress={() => router.push("/settings/difficulties")} />
        <SettingsRow label="Strengths" onPress={() => router.push("/settings/strengths")} />
        <SettingsRow label="Smart scheduling" description="AI-powered task suggestions"
          disabled={!adminAiEnabled} value={settings.smartScheduling}
          onValueChange={(v) => updateSetting("smartScheduling", v)} />
        {Platform.OS === "android" && <SettingsRow label="Voice languages" description="Offline speech models"
          onPress={() => router.push("/settings/voice")} />}
      </SettingsSection>

      <SettingsSection title="Reminders & feedback">
        <SettingsRow label="Notifications" description="Task reminders"
          value={settings.notifications} onValueChange={(v) => updateSetting("notifications", v)} />
        <SettingsRow label="AI Coach" description="Personalized nudges & tips"
          disabled={!settings.notifications} value={settings.coachNotifications}
          onValueChange={(v) => updateSetting("coachNotifications", v)} />
        <SettingsRow label="Sound & haptics" description="Sound effects & vibration"
          value={settings.soundEffects} onValueChange={(v) => updateSetting("soundEffects", v)} />
      </SettingsSection>
    </SettingsPage>
  );
}
