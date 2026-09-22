import { Text } from "react-native";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { settingsStyles as styles } from "../../../src/components/settings/theme";
import { OptionRows } from "../../../src/components/onboarding/OptionRows";
import { usePreferenceList } from "../../../src/hooks/usePreferenceList";
import { PRODUCTIVE_TIMES } from "../../../src/constants/onboarding";

export default function WorkTimesRoute() {
  const { selected, toggle } = usePreferenceList("bestWorkTimes");
  return (
    <SettingsPage parent="Preferences" title="Best work times"
      explanation="When do you usually have the most energy? Help us suggest tasks at times that suit you."
      note={"Your choices save when you go back.\nYou can change them anytime."}>
      <Text style={styles.caption}>Select all that fit</Text>
      <OptionRows items={PRODUCTIVE_TIMES} selected={selected} onToggle={toggle} columns={1} roomy />
    </SettingsPage>
  );
}
