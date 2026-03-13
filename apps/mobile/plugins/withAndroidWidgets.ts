import {
  ConfigPlugin,
  withDangerousMod,
  withAndroidManifest,
  withStringsXml,
} from "expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

const WIDGET_SRC_DIR = "src/widgets/android";
const PACKAGE_PATH = "com/ottersprod/lullio/widget";

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const withAndroidWidgetFiles: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main"
      );

      // Copy Kotlin files
      const kotlinSrc = path.join(projectRoot, WIDGET_SRC_DIR, "kotlin");
      const kotlinDest = path.join(androidRoot, "java", PACKAGE_PATH);
      if (fs.existsSync(kotlinSrc)) {
        copyDirSync(kotlinSrc, kotlinDest);
      }

      // Copy res directories (layout, xml, drawable)
      const resSrc = path.join(projectRoot, WIDGET_SRC_DIR, "res");
      const resDest = path.join(androidRoot, "res");
      if (fs.existsSync(resSrc)) {
        for (const subDir of fs.readdirSync(resSrc)) {
          copyDirSync(path.join(resSrc, subDir), path.join(resDest, subDir));
        }
      }

      return config;
    },
  ]);
};

const withAndroidWidgetManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application?.[0];
    if (!mainApp) return config;

    if (!mainApp.receiver) {
      mainApp.receiver = [];
    }

    const widgetConfigs = [
      { provider: "StreakWidgetProvider", infoXml: "streak_widget_info" },
      {
        provider: "TodayTaskWidgetProvider",
        infoXml: "today_task_widget_info",
      },
      { provider: "MoodWidgetProvider", infoXml: "mood_widget_info" },
    ];

    for (const widget of widgetConfigs) {
      const fullClassName = `com.ottersprod.lullio.widget.${widget.provider}`;

      // Skip if already added
      const exists = mainApp.receiver.some(
        (r: Record<string, unknown>) =>
          (r.$ as Record<string, string>)?.["android:name"] === fullClassName
      );
      if (exists) continue;

      mainApp.receiver.push({
        $: {
          "android:name": fullClassName,
          "android:exported": "true" as const,
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": `@xml/${widget.infoXml}`,
            },
          },
        ],
      } as (typeof mainApp.receiver)[number]);
    }

    return config;
  });
};

const withAndroidWidgetStrings: ConfigPlugin = (config) => {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    const widgetStrings = [
      {
        name: "widget_streak_description",
        value: "Track your daily streak and XP progress",
      },
      {
        name: "widget_today_task_description",
        value: "See your suggested task for today",
      },
      {
        name: "widget_mood_description",
        value: "See your current mood at a glance",
      },
    ];

    for (const ws of widgetStrings) {
      const exists = strings.some(
        (s: Record<string, unknown>) =>
          (s.$ as Record<string, string>)?.name === ws.name
      );
      if (!exists) {
        strings.push({
          $: { name: ws.name },
          _: ws.value,
        } as (typeof strings)[number]);
      }
    }

    config.modResults.resources.string = strings;
    return config;
  });
};

export const withAndroidWidgets: ConfigPlugin = (config) => {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetStrings(config);
  return config;
};
