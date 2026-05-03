import type { ExpoConfig } from "expo/config";

const appName = "Selftend";
const appSlug = "selftend";
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "6f95348d-9f04-436a-aaf8-f8f20f71d6d9";

const config: ExpoConfig = {
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
