import { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
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

export function getLocaleName(code: string): string {
  const [lang, region] = code.split("-");
  const langName = LANGUAGES[lang] ?? lang;
  if (!region) return langName;
  const regionName = REGIONS[region] ?? region;
  return `${langName} (${regionName})`;
}

export function useVoiceLanguages() {
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

  return { locales, installedLocales, downloading, handleLocalePress };
}
