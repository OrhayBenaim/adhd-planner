import { View, Text, Image, Pressable, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onboardingColors as colors, onboardingStyles as styles } from "./theme";

export function PreferenceStep({ title, encouragement, image, items, selected, onToggle, columns = 2 }: {
  title: string; encouragement: string; image: ImageSourcePropType;
  items: readonly { id: string; label: string }[]; selected: string[];
  onToggle: (label: string) => void; columns?: 1 | 2;
}) {
  return <>
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>Select all that fit</Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 100 }}>
      <Text style={[styles.body, { flex: 1, fontSize: 15, lineHeight: 19 }]}>{encouragement}</Text>
      <Image source={image} resizeMode="contain" style={{ width: "51%", height: 100 }} />
    </View>
    <View style={{ gap: 8 }}>
      {Array.from({ length: Math.ceil(items.length / columns) }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 8 }}>
          {items.slice(row * columns, row * columns + columns).map(item => {
            const checked = selected.includes(item.label);
            return <Pressable cssInterop={false} key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.label}
              accessibilityState={{ checked }} onPress={() => onToggle(item.label)}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
                minHeight: 52, paddingVertical: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 14,
                borderWidth: checked ? 2 : 1, borderColor: checked ? colors.primary : colors.border,
                backgroundColor: checked ? colors.selected : colors.white, opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ flex: 1, fontFamily: "Inter-SemiBold", fontSize: 13, lineHeight: 17, color: colors.ink }}>{item.label}</Text>
              <View style={{ width: 28, height: 28, borderRadius: 5, borderWidth: 1,
                borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.white,
                alignItems: "center", justifyContent: "center" }}>
                {checked && <Ionicons name="checkmark" size={22} color="white" />}
              </View>
            </Pressable>;
          })}
        </View>
      ))}
    </View>
  </>;
}
