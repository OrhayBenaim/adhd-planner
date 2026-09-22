import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { OptionRows } from "../../../src/components/onboarding/OptionRows";
import { usePreferenceList } from "../../../src/hooks/usePreferenceList";
import { STRENGTHS } from "../../../src/constants/onboarding";

export default function StrengthsRoute() {
  const { selected, toggle } = usePreferenceList("strengths");
  return (
    <SettingsPage parent="Preferences" title="Strengths"
      explanation="What comes more easily? We lean on these when suggesting what to do next."
      note={"Your choices save when you go back.\nYou can change them anytime."}>
      <OptionRows items={STRENGTHS} selected={selected} onToggle={toggle} />
    </SettingsPage>
  );
}
