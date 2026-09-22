import { ActivityIndicator, View } from "react-native";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { SettingsGroup, SettingsRow } from "../../../src/components/settings/SettingsRow";
import { settingsColors as colors } from "../../../src/components/settings/theme";
import { getLocaleName, useVoiceLanguages } from "../../../src/components/settings/VoiceLanguages";

export default function VoiceLanguagesRoute() {
  const { locales, installedLocales, downloading, handleLocalePress } = useVoiceLanguages();

  return (
    <SettingsPage parent="Preferences" title="Voice languages"
      explanation="Download a language to use voice input when you are offline."
      note={"Downloads use Wi-Fi by default.\nVoice input still works online without a download."}>
      {locales.length === 0
        ? <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        : <SettingsGroup>
            {locales.map((locale) => {
              const isDownloading = downloading.has(locale);
              return <SettingsRow key={locale} label={getLocaleName(locale)} disabled={isDownloading}
                description={installedLocales.has(locale) ? "Downloaded" : isDownloading ? "Downloading…" : "Tap to download"}
                onPress={() => handleLocalePress(locale)} />;
            })}
          </SettingsGroup>}
    </SettingsPage>
  );
}
