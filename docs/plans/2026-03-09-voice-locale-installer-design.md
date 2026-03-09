# Voice Locale Installer — Design

## Summary

Android-only setting in SettingsSheet that lets users browse and install speech recognition locales. Android auto-detects the language during recognition, so no locale selection or persistence is needed — the user just needs the locale installed on-device.

## Setting Item

- New row in SettingsSheet, rendered only when `Platform.OS === 'android'`
- Icon: `language` (Ionicons) with gradient badge (matching existing style)
- Label: "Voice Languages"
- Tapping toggles an inline expandable list of locales below the row (accordion style)

## Locale List

- Fetched via `ExpoSpeechRecognitionModule.getSupportedLocales({ androidRecognitionServicePackage: "com.google.android.as" })`
- Returns `{ locales: string[], installedLocales: string[] }`
- Each item shows human-readable name via `Intl.DisplayNames` (e.g. `en-US` → "English (United States)")
- Installed locales show a checkmark icon
- Tapping an installed locale: no action (already installed)
- Tapping an uninstalled locale: triggers download (system shows its own confirmation dialog)

## Install Flow

1. User taps uninstalled locale
2. `ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale })` is called — system shows its own confirmation dialog
3. ActivityIndicator shown inline on that locale item while downloading
4. Multiple downloads can run in parallel, each with its own spinner
5. On completion: checkmark replaces spinner, locale now shows as installed

## Cleanup

- Remove `sttModel` from `useSettings` hook, `Settings` interface, AsyncStorage, and reducer
- Remove `sttLocale` from Convex `userSettings` schema
- Remove `sttModel` from Convex `userSettings` schema
- No new persistence added — this feature is purely local/on-device

## No Changes to Speech Recognition

- `useSpeechRecognition` remains unchanged
- iOS: continues using device locale via `react-native-localize`
- Android: continues using auto-detection
- The setting only ensures desired locales are installed for auto-detection to work
