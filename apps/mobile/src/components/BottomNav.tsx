import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { AppPressable } from "./AppPressable";
import { homeArtwork } from "../../assets/home/artwork";
import { homeColors, homeStyles } from "./home/theme";

/** Which destination is the current screen. "Add" opens a sheet, so it is never active. */
export type NavTab = "today" | "plan";

interface Props {
  active: NavTab;
  onTodayPress: () => void;
  onListPress: () => void;
  onAddPress: () => void;
  addButtonRef?: React.Ref<View>;
}

export function BottomNav({ active, onTodayPress, onListPress, onAddPress, addButtonRef }: Props) {
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: "white", borderTopWidth: 1, borderColor: homeColors.border,
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 14), flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
    {([
      { tab: "today", label: "Today", icon: homeArtwork.home, onPress: onTodayPress },
      { tab: "plan", label: "My plan", icon: homeArtwork.list, onPress: onListPress },
      { tab: null, label: "Add", icon: homeArtwork.plus, onPress: onAddPress },
    ] as const).map((item, index) => {
      const selected = item.tab === active;
      return <View key={item.label} ref={index === 2 ? addButtonRef : undefined} collapsable={false} style={{ flex: 1, maxWidth: 100 }}>
        <AppPressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }}
          onPress={item.onPress} style={{ minHeight: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 3,
            backgroundColor: selected ? homeColors.selected : "transparent" }}>
          <SvgXml xml={item.icon} width={26} height={26} />
          <Text style={[homeStyles.caption, selected && { fontFamily: "Inter-SemiBold", color: homeColors.ink }]}>{item.label}</Text>
        </AppPressable>
      </View>;
    })}
  </View>;
}
