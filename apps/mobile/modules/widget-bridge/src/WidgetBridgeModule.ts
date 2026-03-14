let nativeModule: {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
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

export function getWidgetData(key: string): string | null {
  return nativeModule?.getItem(key) ?? null;
}

export function clearWidgetData(key: string): void {
  nativeModule?.removeItem(key);
}

export function reloadWidgets(): void {
  nativeModule?.reloadWidgets();
}
