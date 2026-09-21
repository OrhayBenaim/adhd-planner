import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { AppPressable } from "../AppPressable";
import { homeArtwork } from "../../../assets/home/artwork";
import { useHeaderDogMotion } from "../../hooks/useHeaderDogMotion";
import { homeColors, homeStyles } from "./theme";

export function HomeHeader({ onSettings }: { onSettings: () => void }) {
  const dogStyle = useHeaderDogMotion();

  return <View style={{ height: 76, backgroundColor: homeColors.blue }}>
    <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={[homeStyles.heading, { fontSize: 36, lineHeight: 44 }]}>lullio</Text>
      <AppPressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings}
        hitSlop={4} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2,
          borderColor: "white", backgroundColor: homeColors.selected, alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={homeArtwork.settings} width={24} height={24} />
      </AppPressable>
    </View>
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20 }}>
      <SvgXml xml={homeArtwork.wave} width="100%" height={20} />
    </View>
    <Animated.Image source={require("../../../assets/mascot/dog-floating.png")} resizeMode="contain"
      style={[{ position: "absolute", right: 74, top: 11, width: 98, height: 65 }, dogStyle]} />
  </View>;
}
