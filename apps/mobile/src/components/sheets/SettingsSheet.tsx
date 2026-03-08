import { forwardRef } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { Settings } from "../../hooks/useSettings";

interface SettingRowProps {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function SettingRow({ icon, color, title, subtitle, value, onChange }: SettingRowProps) {
  return (
    <View className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Text className="text-base">{icon}</Text>
        </View>
        <View>
          <Text className="text-sm font-medium text-[#1e2939]">{title}</Text>
          <Text className="text-xs text-[#6a7282]">{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
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
}

export const SettingsSheet = forwardRef<BottomSheet, Props>(
  ({ settings, onUpdate, onClose }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["60%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-medium text-[#1e2939]">Settings</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>
          <SettingRow icon="🔔" color="#a2d2ff" title="Notifications" subtitle="Task reminders"
            value={settings.notifications} onChange={(v) => onUpdate("notifications", v)} />
          <SettingRow icon="🌙" color="#cdb4db" title="Focus Mode" subtitle="Minimize distractions"
            value={settings.focusMode} onChange={(v) => onUpdate("focusMode", v)} />
          <SettingRow icon="🔊" color="#ffc8dd" title="Sound Effects" subtitle="Audio feedback"
            value={settings.soundEffects} onChange={(v) => onUpdate("soundEffects", v)} />
          <SettingRow icon="⚡" color="#bde0fe" title="Smart Scheduling" subtitle="AI-powered task order"
            value={settings.smartScheduling} onChange={(v) => onUpdate("smartScheduling", v)} />
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
