import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { AppPressable } from "./AppPressable";
import { homeArtwork } from "../../assets/home/artwork";
import { homeColors, homeStyles } from "./home/theme";

interface Props {
  onTodayPress: () => void;
  onListPress: () => void;
  onAddPress: () => void;
  addButtonRef?: React.Ref<View>;
}

export function BottomNav({ onTodayPress, onListPress, onAddPress, addButtonRef }: Props) {
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: "white", borderTopWidth: 1, borderColor: homeColors.border,
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 14), flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
    {([
      { label: "Today", icon: homeArtwork.home, onPress: onTodayPress },
      { label: "My plan", icon: homeArtwork.list, onPress: onListPress },
      { label: "Add", icon: homeArtwork.plus, onPress: onAddPress },
    ]).map((item, index) => <View key={item.label} ref={index === 2 ? addButtonRef : undefined} collapsable={false} style={{ flex: 1, maxWidth: 100 }}>
      <AppPressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: index === 0 }}
        onPress={item.onPress} style={{ minHeight: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 3,
          backgroundColor: index === 0 ? homeColors.selected : "transparent" }}>
        <SvgXml xml={item.icon} width={26} height={26} />
        <Text style={[homeStyles.caption, index === 0 && { fontFamily: "Inter-SemiBold", color: homeColors.ink }]}>{item.label}</Text>
      </AppPressable>
    </View>)}
  </View>;
}
