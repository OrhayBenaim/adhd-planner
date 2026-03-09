import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

function getLocaleName(code: string): string {
  try {
    const display = new Intl.DisplayNames([code], { type: "language" });
    return display.of(code) ?? code;
  } catch {
    return code;
  }
}

export function VoiceLanguages() {
  const [expanded, setExpanded] = useState(false);
  const [locales, setLocales] = useState<string[]>([]);
  const [installedLocales, setInstalledLocales] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const fetchLocales = useCallback(async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: "com.google.android.as",
      });
      setLocales(result.locales);
      setInstalledLocales(new Set(result.installedLocales));
    } catch (e) {
      console.warn("Failed to fetch locales:", e);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      fetchLocales();
    }
  }, [fetchLocales]);

  const handleLocalePress = useCallback(
    async (locale: string) => {
      if (installedLocales.has(locale) || downloading.has(locale)) return;

      setDownloading((prev) => new Set(prev).add(locale));
      try {
        // The system shows its own confirmation dialog
        const result =
          await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
            locale,
          });
        if (result.status === "download_success") {
          setInstalledLocales((prev) => new Set(prev).add(locale));
        }
      } catch (e) {
        console.warn("Download failed:", e);
      } finally {
        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(locale);
          return next;
        });
        // Refresh the list to get accurate installed state
        fetchLocales();
      }
    },
    [installedLocales, downloading, fetchLocales],
  );

  if (Platform.OS !== "android") return null;

  return (
    <View className="mb-3">
      {/* Header row */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "#cdb4db" }}
          >
            <Ionicons name="language" size={20} color="#fff" />
          </View>
          <View>
            <Text className="text-sm font-medium text-[#1e2939]">
              Voice Languages
            </Text>
            <Text className="text-xs text-[#6a7282]">
              Offline speech models
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6a7282"
        />
      </Pressable>

      {/* Expandable locale list */}
      {expanded && (
        <View className="bg-[#f5f7fa] rounded-2xl mt-1 px-2 py-2 max-h-64">
          {locales.map((locale) => {
            const installed = installedLocales.has(locale);
            const isDownloading = downloading.has(locale);

            return (
              <Pressable
                key={locale}
                onPress={() => handleLocalePress(locale)}
                className="flex-row items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ opacity: isDownloading ? 0.5 : 1 }}
              >
                <Text className="text-sm text-[#1e2939]">
                  {getLocaleName(locale)}
                </Text>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#a2d2ff" />
                ) : installed ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#86efac"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
