import { Redirect } from "expo-router";

// Preserve old deep links; reminder permission is no longer an onboarding step.
export default function LegacyNotificationsStep() {
  return <Redirect href="/(onboarding)/save-progress" />;
}
