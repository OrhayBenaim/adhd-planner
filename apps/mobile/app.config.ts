import type { ConfigContext, ExpoConfig } from "expo/config";
import { withAndroidWidgets } from "./plugins/withAndroidWidgets";
import { withIOSWidgets } from "./plugins/withIOSWidgets";

export default ({ config }: ConfigContext): ExpoConfig => {
  let modifiedConfig: ExpoConfig = {
    ...config,
    name: config.name!,
    slug: config.slug!,
  };

  modifiedConfig = withAndroidWidgets(modifiedConfig);
  modifiedConfig = withIOSWidgets(modifiedConfig);

  return modifiedConfig;
};
