import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  plugins: [
    ...(config.plugins || []),
    "./plugins/withAndroidWidgets",
    "./plugins/withIOSWidgets",
  ],
});
