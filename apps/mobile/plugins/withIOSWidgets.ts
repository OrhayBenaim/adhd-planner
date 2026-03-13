import {
  ConfigPlugin,
  withXcodeProject,
  withDangerousMod,
  withEntitlementsPlist,
} from "expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

const WIDGET_EXTENSION_NAME = "LullioWidgets";
const WIDGET_BUNDLE_ID = "com.ottersprod.lullio.widgets";
const APP_GROUP = "group.com.ottersprod.lullio.widgets";
const SWIFT_SRC_DIR = "src/widgets/ios";
const DEPLOYMENT_TARGET = "17.0";

// Ensure main app has App Group entitlement
const withAppGroupEntitlement: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return config;
  });
};

// Copy Swift files and create extension support files
const withWidgetExtensionFiles: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      const extensionDir = path.join(iosRoot, WIDGET_EXTENSION_NAME);

      fs.mkdirSync(extensionDir, { recursive: true });

      // Copy Swift source files
      const swiftSrcDir = path.join(projectRoot, SWIFT_SRC_DIR);
      if (fs.existsSync(swiftSrcDir)) {
        for (const file of fs.readdirSync(swiftSrcDir)) {
          if (file.endsWith(".swift")) {
            fs.copyFileSync(
              path.join(swiftSrcDir, file),
              path.join(extensionDir, file)
            );
          }
        }
      }

      // Create entitlements file
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(extensionDir, `${WIDGET_EXTENSION_NAME}.entitlements`),
        entitlements
      );

      // Create Info.plist
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionDir, "Info.plist"), infoPlist);

      return config;
    },
  ]);
};

// Add widget extension target to Xcode project
const withWidgetXcodeTarget: ConfigPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    // Check if target already exists
    if (project.pbxTargetByName(WIDGET_EXTENSION_NAME)) {
      return config;
    }

    // Get main app target for embedding
    const { uuid: mainTargetUuid } = project.getFirstTarget();
    const { firstProject } = project.getFirstProject();
    const mainGroupId = firstProject.mainGroup;

    // Add the widget extension target
    const target = project.addTarget(
      WIDGET_EXTENSION_NAME,
      "app_extension",
      WIDGET_EXTENSION_NAME,
      WIDGET_BUNDLE_ID
    );

    // Create a group for the widget extension files
    const group = project.addPbxGroup(
      [],
      WIDGET_EXTENSION_NAME,
      WIDGET_EXTENSION_NAME,
      '"<group>"'
    );
    project.addToPbxGroup(group.uuid, mainGroupId);

    // Add Swift source files to the widget target
    const extensionDir = path.join(
      projectRoot,
      "ios",
      WIDGET_EXTENSION_NAME
    );
    if (fs.existsSync(extensionDir)) {
      const swiftFiles = fs
        .readdirSync(extensionDir)
        .filter((f) => f.endsWith(".swift"));
      for (const file of swiftFiles) {
        project.addSourceFile(
          `${WIDGET_EXTENSION_NAME}/${file}`,
          { target: target.uuid },
          group.uuid
        );
      }
    }

    // Add WidgetKit and SwiftUI frameworks to the widget target
    project.addFramework("WidgetKit.framework", {
      target: target.uuid,
      link: true,
    });
    project.addFramework("SwiftUI.framework", {
      target: target.uuid,
      link: true,
    });

    // Set build settings for the widget target
    const buildSettings = {
      PRODUCT_BUNDLE_IDENTIFIER: `"${WIDGET_BUNDLE_ID}"`,
      INFOPLIST_FILE: `"${WIDGET_EXTENSION_NAME}/Info.plist"`,
      CODE_SIGN_ENTITLEMENTS: `"${WIDGET_EXTENSION_NAME}/${WIDGET_EXTENSION_NAME}.entitlements"`,
      IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: `"1,2"`,
      SKIP_INSTALL: "YES",
      GENERATE_INFOPLIST_FILE: "YES",
      CURRENT_PROJECT_VERSION: "1",
      MARKETING_VERSION: "1.0",
      CODE_SIGN_STYLE: "Automatic",
      SWIFT_EMIT_LOC_STRINGS: "YES",
    };

    for (const [key, value] of Object.entries(buildSettings)) {
      project.updateBuildProperty(
        key,
        value,
        undefined,
        WIDGET_EXTENSION_NAME
      );
    }

    // Add embed extension build phase to main app target
    project.addBuildPhase(
      [],
      "PBXCopyFilesBuildPhase",
      "Embed Foundation Extensions",
      mainTargetUuid,
      "app_extension"
    );

    // Add target dependency: main app depends on widget extension
    project.addTargetDependency(mainTargetUuid, [target.uuid]);

    return config;
  });
};

export const withIOSWidgets: ConfigPlugin = (config) => {
  config = withAppGroupEntitlement(config);
  config = withWidgetExtensionFiles(config);
  config = withWidgetXcodeTarget(config);
  return config;
};
