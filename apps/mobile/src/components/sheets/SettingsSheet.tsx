import { forwardRef, useCallback } from "react";
import { View, Text, Switch } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useHome } from "../home/HomeProvider";
import { usePremium } from "../../hooks/usePremium";
import { ProBadge } from "../ProBadge";
import {
  useVoiceLanguages,
  VoiceLanguagesHeader,
  VoiceLocaleRow,
} from "../settings/VoiceLanguages";

interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  isPro?: boolean;
}

function SettingRow({ icon, color, title, subtitle, value, onChange, disabled, isPro }: SettingRowProps) {
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
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-medium text-[#1e2939]">{title}</Text>
            {isPro && <ProBadge />}
          </View>
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
  onClose: () => void;
}

export const SettingsSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { settings, updateSetting, adminAiEnabled, closeSheet } = useHome();
    const { isPremium, showPaywall } = usePremium();
    const voice = useVoiceLanguages();

    const header = useCallback(
      () => (
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-medium text-[#1e2939]">Settings</Text>
            <Pressable onPress={closeSheet}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>
          <SettingRow icon="notifications-outline" color="#a2d2ff" title="Notifications" subtitle="Task reminders"
            value={settings.notifications} onChange={(v) => updateSetting("notifications", v)} />
          {settings.notifications && (
            <SettingRow icon="chatbubble-ellipses-outline" color="#cdb4db" title="AI Coach" subtitle="Personalized nudges & tips"
              value={settings.coachNotifications} isPro
              onChange={(v) => { isPremium ? updateSetting("coachNotifications", v) : showPaywall(); }} />
          )}
          <SettingRow icon="volume-high-outline" color="#ffc8dd" title="Sound Effects" subtitle="Haptic & sound feedback"
            value={settings.soundEffects} onChange={(v) => updateSetting("soundEffects", v)} />
          <SettingRow icon="flash-outline" color="#bde0fe" title="Smart Scheduling" subtitle="AI-powered task scoring"
            value={settings.smartScheduling} onChange={(v) => updateSetting("smartScheduling", v)}
            disabled={!adminAiEnabled} />
          <VoiceLanguagesHeader expanded={voice.expanded} onToggle={voice.toggleExpanded} />
        </View>
      ),
      [settings, adminAiEnabled, isPremium, showPaywall, closeSheet, updateSetting, voice.expanded, voice.toggleExpanded],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["65%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetFlatList
          data={voice.locales}
          keyExtractor={(item: string) => item}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: locale }: { item: string }) => (
            <VoiceLocaleRow
              locale={locale}
              installed={voice.installedLocales.has(locale)}
              isDownloading={voice.downloading.has(locale)}
              onPress={() => voice.handleLocalePress(locale)}
            />
          )}
        />
      </BottomSheet>
    );
  }
);
