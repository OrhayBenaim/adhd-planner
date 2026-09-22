import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { OptionRows } from "../../../src/components/onboarding/OptionRows";
import { usePreferenceList } from "../../../src/hooks/usePreferenceList";
import { DIFFICULTIES } from "../../../src/constants/onboarding";

export default function DifficultiesRoute() {
  const { selected, toggle } = usePreferenceList("difficulties");
  return (
    <SettingsPage parent="Preferences" title="Difficulties"
      explanation="What tends to feel hard? We use this to break those tasks into smaller first steps."
      note={"Your choices save when you go back.\nYou can change them anytime."}>
      <OptionRows items={DIFFICULTIES} selected={selected} onToggle={toggle} />
    </SettingsPage>
  );
}
