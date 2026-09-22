import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { AppPressable } from "../AppPressable";
import { homeArtwork } from "../../../assets/home/artwork";
import { FloatingDog } from "../mascot/FloatingDog";
import { homeColors, homeStyles } from "./theme";

export function HomeHeader({ title = "lullio", onSettings }: { title?: string; onSettings: () => void }) {
  return <View style={{ height: 76, backgroundColor: homeColors.blue }}>
    <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={[homeStyles.heading, { fontSize: 36, lineHeight: 44 }]}>{title}</Text>
      <AppPressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings}
        hitSlop={4} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2,
          borderColor: "white", backgroundColor: homeColors.selected, alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={homeArtwork.settings} width={24} height={24} />
      </AppPressable>
    </View>
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20 }}>
      <SvgXml xml={homeArtwork.wave} width="100%" height={20} />
    </View>
    <FloatingDog right={74} bottom={-6} />
  </View>;
}
