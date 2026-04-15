import type { ExpoConfig } from "expo/config";

const appName = "mental-health";
const appSlug = "mental-health";

const config: ExpoConfig = {
  name: appName,
  slug: appSlug,
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "mentalhealth",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#f4efe5",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "org.vasilyoshev.mentalhealth",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f4efe5",
    },
    edgeToEdgeEnabled: true,
    package: "org.vasilyoshev.mentalhealth",
  },
  web: {
    bundler: "metro",
    output: "static",
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
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
};

export default config;
