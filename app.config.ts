import type { ExpoConfig } from "expo/config";
import { withAndroidManifest, type ConfigPlugin } from "@expo/config-plugins";

const easBuildProfile = process.env.EAS_BUILD_PROFILE;
const isDevelopmentBuild =
  easBuildProfile === "development" || process.env.SELFTEND_APP_VARIANT === "development";
const appName = isDevelopmentBuild ? "Selftend Dev" : "Selftend";
const appSlug = isDevelopmentBuild ? "selftend-dev" : "selftend";
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
        widgets: [
          {
            name: "MoodCheckin",
            label: "Selftend - Mood check-in",
            description: "Tap a face to log how you feel right now",
            minWidth: "250dp",
            minHeight: "70dp",
            targetCellWidth: 4,
            targetCellHeight: 1,
            maxResizeWidth: "320dp",
            maxResizeHeight: "120dp",
            resizeMode: "horizontal",
            previewImage: "./assets/widget-preview/moodcheckin.png",
            updatePeriodMillis: 0,
          },
          {
            name: "Breathing",
            label: "Selftend - Breathing",
            description: "Quick-launch a breathing exercise",
            minWidth: "250dp",
            minHeight: "70dp",
            targetCellWidth: 4,
            targetCellHeight: 1,
            maxResizeWidth: "320dp",
            maxResizeHeight: "120dp",
            resizeMode: "horizontal",
            previewImage: "./assets/widget-preview/breathing.png",
            updatePeriodMillis: 0,
          },
          {
            name: "Grounding",
            label: "Selftend - Grounding",
            description: "Quick-launch a grounding technique",
            minWidth: "250dp",
            minHeight: "70dp",
            targetCellWidth: 4,
            targetCellHeight: 1,
            maxResizeWidth: "320dp",
            maxResizeHeight: "120dp",
            resizeMode: "horizontal",
            previewImage: "./assets/widget-preview/grounding.png",
            updatePeriodMillis: 0,
          },
          {
            name: "Mindfulness",
            label: "Selftend - Meditation",
            description: "Quick-launch a meditation practice",
            minWidth: "250dp",
            minHeight: "150dp",
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: "320dp",
            maxResizeHeight: "220dp",
            resizeMode: "horizontal|vertical",
            previewImage: "./assets/widget-preview/mindfulness.png",
            updatePeriodMillis: 0,
          },
          {
            name: "Activity",
            label: "Selftend - Schedule activity",
            description: "Pick a life domain and start a new activity",
            minWidth: "250dp",
            minHeight: "150dp",
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: "320dp",
            maxResizeHeight: "220dp",
            resizeMode: "horizontal|vertical",
            previewImage: "./assets/widget-preview/activity.png",
            updatePeriodMillis: 0,
          },
        ],
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
