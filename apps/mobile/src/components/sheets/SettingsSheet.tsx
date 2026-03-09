import { forwardRef } from "react";
import { View, Text, Switch } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { Settings } from "../../hooks/useSettings";

interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ icon, color, title, subtitle, value, onChange, disabled }: SettingRowProps) {
  return (
    <View
      className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center justify-between mb-3"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View>
          <Text className="text-sm font-medium text-[#1e2939]">{title}</Text>
          <Text className="text-xs text-[#6a7282]">{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#e5e7eb", true: "#a2d2ff" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
  adminAiEnabled: boolean;
}

export const SettingsSheet = forwardRef<BottomSheet, Props>(
  ({ settings, onUpdate, onClose, adminAiEnabled }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-medium text-[#1e2939]">Settings</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>
          <SettingRow icon="notifications-outline" color="#a2d2ff" title="Notifications" subtitle="Task reminders"
            value={settings.notifications} onChange={(v) => onUpdate("notifications", v)} />
          <SettingRow icon="volume-high-outline" color="#ffc8dd" title="Sound Effects" subtitle="Haptic & sound feedback"
            value={settings.soundEffects} onChange={(v) => onUpdate("soundEffects", v)} />
          <SettingRow icon="flash-outline" color="#bde0fe" title="Smart Scheduling" subtitle="AI-powered task scoring"
            value={settings.smartScheduling} onChange={(v) => onUpdate("smartScheduling", v)}
            disabled={!adminAiEnabled} />
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
