import { forwardRef, useState, useEffect } from "react";
import { View, Text, Switch, Platform, Alert, ActivityIndicator } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { ExpoSpeechRecognitionModule } from "@jamsch/expo-speech-recognition";
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

function SttModelSection({
  currentModel,
  onModelChange,
}: {
  currentModel: string;
  onModelChange: (model: string) => void;
}) {
  const [locales, setLocales] = useState<{ installed: string[]; available: string[] }>({
    installed: [],
    available: [],
  });
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage:
          "com.google.android.googlequicksearchbox",
      }).then((result) => {
        setLocales({
          installed: result.installedLocales ?? [],
          available: result.locales ?? [],
        });
      }).catch(() => {});
    }
  }, []);

  const handleSelectModel = (model: string) => {
    if (model === "default" || locales.installed.includes(model)) {
      onModelChange(model);
      setExpanded(false);
    } else {
      // Need to download first
      Alert.alert(
        "Download Offline Model",
        `Download the offline speech model for "${model}"? This allows voice input without internet.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Download",
            onPress: async () => {
              setDownloading(true);
              try {
                await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
                  locale: model,
                });
                onModelChange(model);
              } catch {
                Alert.alert("Download Failed", "Could not download the model. Please try again.");
              } finally {
                setDownloading(false);
              }
            },
          },
        ]
      );
    }
  };

  const displayName = currentModel === "default" ? "System Default" : currentModel;

  return (
    <View className="mb-3">
      <View className="bg-[#f5f7fa] rounded-3xl px-4 py-4">
        <Pressable onPress={() => setExpanded(!expanded)}>
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "#cdb4db" }}
            >
              <Ionicons name="mic-outline" size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-[#1e2939]">Voice Model</Text>
              <Text className="text-xs text-[#6a7282]">{displayName}</Text>
            </View>
            {downloading ? (
              <ActivityIndicator size="small" color="#a2d2ff" />
            ) : (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6a7282"
              />
            )}
          </View>
        </Pressable>

        {expanded && Platform.OS === "android" && (
          <View className="mt-3 pt-3 border-t border-[#e5e7eb]">
            <Pressable
              onPress={() => handleSelectModel("default")}
              className="py-2 px-3 rounded-xl mb-1"
              style={{
                backgroundColor: currentModel === "default" ? "rgba(162,210,255,0.3)" : "transparent",
              }}
            >
              <Text className="text-sm text-[#1e2939]">System Default</Text>
              <Text className="text-xs text-[#6a7282]">Uses network when available</Text>
            </Pressable>

            {locales.available.slice(0, 10).map((locale) => {
              const isInstalled = locales.installed.includes(locale);
              const isSelected = currentModel === locale;
              return (
                <Pressable
                  key={locale}
                  onPress={() => handleSelectModel(locale)}
                  className="py-2 px-3 rounded-xl mb-1"
                  style={{
                    backgroundColor: isSelected ? "rgba(162,210,255,0.3)" : "transparent",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-[#1e2939]">{locale}</Text>
                      <Text className="text-xs text-[#6a7282]">
                        {isInstalled ? "Downloaded" : "Tap to download"}
                      </Text>
                    </View>
                    {isInstalled && (
                      <Ionicons name="checkmark-circle" size={18} color="#a2d2ff" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {expanded && Platform.OS === "ios" && (
          <View className="mt-3 pt-3 border-t border-[#e5e7eb]">
            <Text className="text-xs text-[#6a7282] px-3">
              iOS uses the built-in on-device speech model. No additional downloads needed.
            </Text>
          </View>
        )}
      </View>
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
          <SttModelSection
            currentModel={settings.sttModel}
            onModelChange={(model) => onUpdate("sttModel", model)}
          />
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
