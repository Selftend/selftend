import type { ExpoConfig } from "expo/config";

const appName = "Selftend";
const appSlug = "selftend";
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "032dd368-6eae-4a70-bbe5-4ccef2fc06cb";

const config: ExpoConfig = {
  owner: "vasil.yoshev",
  name: appName,
  slug: appSlug,
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "selftend",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#f4efe5",
  },
  ios: {
    supportsTablet: true,
    buildNumber: "1",
    bundleIdentifier: "org.vasilyoshev.selftend",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f4efe5",
    },
    edgeToEdgeEnabled: true,
    package: "org.vasilyoshev.selftend",
    versionCode: 1,
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
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
        photosPermission:
          "Selftend lets you choose a profile picture for your account.",
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
  },
};

export default config;
