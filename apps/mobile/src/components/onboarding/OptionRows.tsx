import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onboardingColors as colors } from "./theme";

/**
 * The multi-select checkbox rows shared by onboarding steps and the settings
 * preference screens. `roomy` is the taller, larger-type row the settings
 * "Best work times" screen uses; onboarding keeps the compact one.
 */
export function OptionRows({ items, selected, onToggle, columns = 2, roomy = false }: {
  items: readonly { id: string; label: string }[];
  selected: string[];
  onToggle: (label: string) => void;
  columns?: 1 | 2;
  roomy?: boolean;
}) {
  const single = roomy;
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: Math.ceil(items.length / columns) }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 8 }}>
          {items.slice(row * columns, row * columns + columns).map(item => {
            const checked = selected.includes(item.label);
            return <Pressable cssInterop={false} key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.label}
              accessibilityState={{ checked }} onPress={() => onToggle(item.label)}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
                minHeight: single ? 66 : 52, paddingVertical: 8, paddingLeft: single ? 16 : 12, paddingRight: single ? 16 : 10,
                borderRadius: 14, borderWidth: checked ? 2 : 1,
                borderColor: checked ? colors.primary : colors.border,
                backgroundColor: checked ? colors.selected : colors.white, opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ flex: 1, fontFamily: "Inter-SemiBold", fontSize: single ? 16 : 13,
                lineHeight: single ? 22 : 17, color: colors.ink }}>{item.label}</Text>
              <View style={{ width: 28, height: 28, borderRadius: 6, borderWidth: checked ? 1 : 1.5,
                borderColor: checked ? colors.primary : colors.body,
                backgroundColor: checked ? colors.primary : colors.white,
                alignItems: "center", justifyContent: "center" }}>
                {checked && <Ionicons name="checkmark" size={22} color="white" />}
              </View>
            </Pressable>;
          })}
        </View>
      ))}
    </View>
  );
}
