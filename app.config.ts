import type { ExpoConfig } from "expo/config";
import { withAndroidManifest, type ConfigPlugin } from "@expo/config-plugins";

const widgetCatalog = require("./src/features/widgets/widget-catalog.json") as {
  name: string;
  widgetFeatures?: string;
  size: {
    minWidth: string;
    minHeight: string;
    maxWidth: string;
    maxHeight: string;
    targetCellWidth: number;
    targetCellHeight: number;
    resizeMode: string;
  };
}[];

const easBuildProfile = process.env.EAS_BUILD_PROFILE;
const isDevelopmentBuild =
  easBuildProfile === "development" || process.env.SELFTEND_APP_VARIANT === "development";
const appName = isDevelopmentBuild ? "Selftend Dev" : "Selftend";
// Both variants share one EAS project (extra.eas.projectId), whose registered slug is
// "selftend". The slug must match that project, so it does NOT change per variant — the dev
// build differentiates via name/package/scheme instead.
const appSlug = "selftend";
const appScheme = isDevelopmentBuild ? "selftend-dev" : "selftend";
const androidPackage = isDevelopmentBuild
  ? "org.vasilyoshev.selftend.dev"
  : "org.vasilyoshev.selftend";
const iosBundleIdentifier = isDevelopmentBuild
  ? "org.vasilyoshev.selftend.dev"
  : "org.vasilyoshev.selftend";
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "032dd368-6eae-4a70-bbe5-4ccef2fc06cb";
const requiredReleaseEnv = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

function validateReleaseBuildEnv() {
  if (easBuildProfile !== "preview" && easBuildProfile !== "production") {
    return;
  }

  const missing = requiredReleaseEnv.filter((name) => !process.env[name]);
  if (!missing.length) {
    return;
  }

  throw new Error(
    `Missing required public environment values for the ${easBuildProfile} EAS build: ${missing.join(
      ", ",
    )}. Set them in the matching EAS environment before building.`,
  );
}

validateReleaseBuildEnv();

const withDevelopmentCleartextTraffic: ConfigPlugin = (config) => {
  if (!isDevelopmentBuild) {
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (application) {
      application.$["android:usesCleartextTraffic"] = "true";
    }

    return config;
  });
};

const config: ExpoConfig = withDevelopmentCleartextTraffic({
  owner: "vasil.yoshev",
  name: appName,
  slug: appSlug,
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: appScheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#f4efe5",
  },
  ios: {
    supportsTablet: true,
    buildNumber: "1",
    bundleIdentifier: iosBundleIdentifier,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f4efe5",
    },
    edgeToEdgeEnabled: true,
    package: androidPackage,
    versionCode: 1,
    // Firebase config for FCM (Android push). One file per build variant, since the dev and
    // prod variants use different package names. Safe to commit (public identifiers only).
    googleServicesFile: isDevelopmentBuild
      ? "./google-services.dev.json"
      : "./google-services.json",
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "./assets/adaptive-icon.png",
        color: "#5b6b52",
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission: false,
        microphonePermission: false,
        photosPermission: "Selftend lets you choose a profile picture for your account.",
      },
    ],
    "expo-secure-store",
    [
      "react-native-android-widget",
      {
        widgets: widgetCatalog.map((w) => ({
          name: w.name,
          label: `Selftend - ${w.name}`,
          description: "Selftend widget",
          minWidth: w.size.minWidth,
          minHeight: w.size.minHeight,
          maxResizeWidth: w.size.maxWidth,
          maxResizeHeight: w.size.maxHeight,
          targetCellWidth: w.size.targetCellWidth,
          targetCellHeight: w.size.targetCellHeight,
          resizeMode: w.size.resizeMode,
          previewImage: "./assets/widget-preview/stat.png",
          updatePeriodMillis: 0,
          ...(w.widgetFeatures ? { widgetFeatures: w.widgetFeatures } : {}),
        })),
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
  },
});

export default config;
