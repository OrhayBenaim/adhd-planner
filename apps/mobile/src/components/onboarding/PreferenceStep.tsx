import { View, Text, Image, type ImageSourcePropType } from "react-native";
import { OptionRows } from "./OptionRows";
import { onboardingStyles as styles } from "./theme";

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
    <OptionRows items={items} selected={selected} onToggle={onToggle} columns={columns} />
  </>;
}
