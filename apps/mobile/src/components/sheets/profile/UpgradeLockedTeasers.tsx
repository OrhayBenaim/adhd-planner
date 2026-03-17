import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../../AppPressable";

interface UpgradeLockedTeasersProps {
  onUpgrade: (source: string) => void;
}

export function UpgradeLockedTeasers({ onUpgrade }: UpgradeLockedTeasersProps) {
  return (
    <Pressable
      onPress={() => onUpgrade("value_card")}
      className="bg-[#cdb4db]/15 rounded-3xl px-4 py-5 mb-3 items-center"
    >
      <Text className="text-sm text-[#6A7282] text-center mb-2">
        70% of users complete all their tasks
      </Text>
      <Text className="text-sm font-medium text-[#9b59b6]">
        Upgrade to Pro
      </Text>
    </Pressable>
  );
}
