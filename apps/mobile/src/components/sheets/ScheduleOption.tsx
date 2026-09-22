import { Text } from "react-native";
import { AppPressable } from "../AppPressable";
import { homeColors, homeStyles } from "../home/theme";

export function ScheduleOption({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  return <AppPressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={{ flex: 1, minHeight: 62, padding: 12, borderRadius: 16, borderWidth: selected ? 2 : 1,
      borderColor: selected ? homeColors.primary : homeColors.border, backgroundColor: selected ? homeColors.selected : homeColors.surface,
      alignItems: "center", justifyContent: "center" }}>
    <Text style={[homeStyles.body, { fontFamily: "Inter-SemiBold", color: homeColors.ink, textAlign: "center" }]}>{label}</Text>
  </AppPressable>;
}
