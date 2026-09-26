import { Image, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { EmptySlotState, SlotTransition } from "../../lib/nextStepSlot";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { emptyPartMotion } from "./nextStepMotion";
import { homeColors } from "./theme";

const emptyPlanner = require("../../../assets/mascot/dog-empty-planner.png");
const allDone = require("../../../assets/mascot/dog-all-done.png");

const CONTENT: Record<EmptySlotState, { art: number; title: string; body: string }> = {
  nothingPlanned: { art: emptyPlanner, title: "Nothing planned yet", body: "Add one small thing. We'll take it from there." },
  noEnergyMatch: { art: emptyPlanner, title: "No match right now", body: "Nothing fits your energy right now. Try moving the slider." },
  allDone: { art: allDone, title: "All done for today", body: "That's everything. Rest, or add one more small thing." },
};

interface Props {
  state: EmptySlotState;
  transition: SlotTransition | null;
  reduced: boolean;
  onAdd: () => void;
}

/** Nothing planned, No energy match and All done: art, title, body, Add a task. No card. */
export function NextStepEmptyState({ state, transition, reduced, onAdd }: Props) {
  const { art, title, body } = CONTENT[state];
  const motion = (part: Parameters<typeof emptyPartMotion>[0]) => emptyPartMotion(part, transition, reduced);

  return <View style={{ alignItems: "center", gap: 16, paddingVertical: 8 }}>
    <Animated.View key={`art-${state}`} {...motion("art")} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={art} resizeMode="contain" style={{ width: 306, height: 204 }} />
    </Animated.View>
    <Animated.Text key={`title-${state}`} {...motion("title")} accessibilityRole="header"
      style={{ fontFamily: "Nunito-ExtraBold", fontSize: 24, lineHeight: 30, color: homeColors.ink, textAlign: "center" }}>
      {title}
    </Animated.Text>
    <Animated.View key={`body-${state}`} {...motion("body")} style={{ maxWidth: 321 }}>
      <Text style={{ fontFamily: "Inter-Regular", fontSize: 15, lineHeight: 22, color: homeColors.body, textAlign: "center" }}>
        {body}
      </Text>
    </Animated.View>
    <Animated.View key={`button-${state === "allDone"}`} {...motion("button")} style={{ width: 168 }}>
      <OnboardingButton label="Add a task" onPress={onAdd} secondary compact />
    </Animated.View>
  </View>;
}
