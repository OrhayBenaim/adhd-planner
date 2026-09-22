import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "./AppPressable";
import { OnboardingButton } from "./onboarding/OnboardingButton";
import { homeColors, homeStyles } from "./home/theme";

interface Props {
  onRate: () => void;
  onDismiss: () => void;
}

const BADGE = 76;
// The dog-star art is 320x213; the badge shows a 200x200 window over the dog.
const CROP = BADGE / 200;

/** Circular crop of the dog-star mascot (Figma 322:1285). */
function MascotBadge() {
  return (
    <View style={{ width: BADGE, height: BADGE, borderRadius: 999, overflow: "hidden",
      backgroundColor: homeColors.white, borderWidth: 2, borderColor: homeColors.accent }}>
      <Image
        source={require("../../assets/mascot/dog-star.png")}
        style={{ position: "absolute", left: -60 * CROP, top: -5 * CROP,
          width: 320 * CROP, height: 213 * CROP }}
      />
    </View>
  );
}

export function RatingPromptBanner({ onRate, onDismiss }: Props) {
  return (
    <View style={[homeStyles.notice, { backgroundColor: homeColors.blue }]}>
      <View style={homeStyles.noticeRow}>
        <MascotBadge />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Ionicons key={i} name="star" size={15} color={homeColors.accent} />
            ))}
          </View>
          {/* flex:0 undoes noticeTitle's row-layout stretch now that it sits in a column. */}
          <Text style={[homeStyles.noticeTitle, { flex: 0, fontSize: 22 }]}>Enjoying Lullio?</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss rating prompt"
          style={homeStyles.dismiss}
        >
          <Ionicons name="close" size={16} color={homeColors.ink} />
        </Pressable>
      </View>

      <Text style={homeStyles.body}>
        A quick rating helps other ADHD brains find us.
      </Text>

      <View style={{ height: 4 }} />
      <OnboardingButton label="Rate Lullio" onPress={onRate} />
    </View>
  );
}
