let nativeModule: {
  setItem(key: string, value: string): void;
  reloadWidgets(): void;
} | null = null;

try {
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("WidgetBridge");
} catch {
  // Module not available (e.g. Expo Go) — no-op
}

export function setWidgetData(key: string, value: string): void {
  nativeModule?.setItem(key, value);
}

export function reloadWidgets(): void {
  nativeModule?.reloadWidgets();
}
