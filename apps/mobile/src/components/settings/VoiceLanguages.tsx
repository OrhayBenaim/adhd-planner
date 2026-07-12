import { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react-native";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

const LANGUAGES: Record<string, string> = {
  af: "Afrikaans", am: "Amharic", ar: "Arabic", az: "Azerbaijani",
  be: "Belarusian", bg: "Bulgarian", bn: "Bengali", bs: "Bosnian",
  ca: "Catalan", cs: "Czech", cy: "Welsh", da: "Danish", de: "German",
  el: "Greek", en: "English", es: "Spanish", et: "Estonian", eu: "Basque",
  fa: "Persian", fi: "Finnish", fil: "Filipino", fr: "French", gl: "Galician",
  gu: "Gujarati", he: "Hebrew", hi: "Hindi", hr: "Croatian", hu: "Hungarian",
  hy: "Armenian", id: "Indonesian", is: "Icelandic", it: "Italian",
  ja: "Japanese", jv: "Javanese", ka: "Georgian", kk: "Kazakh", km: "Khmer",
  kn: "Kannada", ko: "Korean", lo: "Lao", lt: "Lithuanian", lv: "Latvian",
  mk: "Macedonian", ml: "Malayalam", mn: "Mongolian", mr: "Marathi",
  ms: "Malay", my: "Burmese", nb: "Norwegian", ne: "Nepali", nl: "Dutch",
  no: "Norwegian", pl: "Polish", pt: "Portuguese", ro: "Romanian",
  ru: "Russian", si: "Sinhala", sk: "Slovak", sl: "Slovenian", sq: "Albanian",
  sr: "Serbian", su: "Sundanese", sv: "Swedish", sw: "Swahili", ta: "Tamil",
  te: "Telugu", th: "Thai", tr: "Turkish", uk: "Ukrainian", ur: "Urdu",
  uz: "Uzbek", vi: "Vietnamese", yue: "Cantonese", zh: "Chinese",
  zu: "Zulu",
};

const REGIONS: Record<string, string> = {
  AR: "Argentina", AU: "Australia", AT: "Austria", BD: "Bangladesh",
  BE: "Belgium", BR: "Brazil", CA: "Canada", CL: "Chile", CN: "China",
  CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark", EG: "Egypt",
  ES: "Spain", FI: "Finland", FR: "France", GB: "UK", GH: "Ghana",
  GR: "Greece", HK: "Hong Kong", ID: "Indonesia", IE: "Ireland",
  IL: "Israel", IN: "India", IQ: "Iraq", IT: "Italy", JP: "Japan",
  KE: "Kenya", KR: "South Korea", MX: "Mexico", MY: "Malaysia",
  NG: "Nigeria", NL: "Netherlands", NO: "Norway", NZ: "New Zealand",
  PE: "Peru", PH: "Philippines", PK: "Pakistan", PL: "Poland",
  PT: "Portugal", RO: "Romania", RU: "Russia", SA: "Saudi Arabia",
  SE: "Sweden", SG: "Singapore", TH: "Thailand", TR: "Turkey",
  TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine", US: "US", VE: "Venezuela",
  VN: "Vietnam", ZA: "South Africa",
};

function getLocaleName(code: string): string {
  const [lang, region] = code.split("-");
  const langName = LANGUAGES[lang] ?? lang;
  if (!region) return langName;
  const regionName = REGIONS[region] ?? region;
  return `${langName} (${regionName})`;
}

export function useVoiceLanguages() {
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
      Sentry.captureException(e);
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
        const result =
          await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
            locale,
          });
        if (result.status === "download_success") {
          setInstalledLocales((prev) => new Set(prev).add(locale));
        }
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(locale);
          return next;
        });
        fetchLocales();
      }
    },
    [installedLocales, downloading, fetchLocales],
  );

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  return {
    expanded,
    toggleExpanded,
    locales: expanded ? locales : [],
    installedLocales,
    downloading,
    handleLocalePress,
  };
}

export function VoiceLanguagesHeader({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  if (Platform.OS !== "android") return null;

  return (
    <View className="mb-3">
      <Pressable
        onPress={onToggle}
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
    </View>
  );
}

export function VoiceLocaleRow({
  locale,
  installed,
  isDownloading,
  onPress,
}: {
  locale: string;
  installed: boolean;
  isDownloading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-3 py-2.5 mx-2 rounded-xl"
      style={{ opacity: isDownloading ? 0.5 : 1 }}
    >
      <Text className="text-sm text-[#1e2939]">
        {getLocaleName(locale)}
      </Text>
      {isDownloading ? (
        <ActivityIndicator size="small" color="#a2d2ff" />
      ) : installed ? (
        <Ionicons name="checkmark-circle" size={18} color="#86efac" />
      ) : null}
    </Pressable>
  );
}
