import type { ExpoConfig } from "expo/config";
import { withAndroidManifest, type ConfigPlugin } from "expo/config-plugins";

const widgetCatalog = require("./src/features/widgets/widget-catalog.json") as {
  name: string;
  label: string;
  description: string;
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

// Human-facing version name (single source of truth: package.json, bumped by
// release-please). EAS remote versioning owns the integer versionCode separately.
const appVersion = (require("./package.json") as { version: string }).version;

const easBuildProfile = process.env.EAS_BUILD_PROFILE;
const isDevelopmentBuild =
  easBuildProfile === "development" || process.env.SELFTEND_APP_VARIANT === "development";
const appName = isDevelopmentBuild ? "Selftend Dev" : "Selftend";
// Both variants share one EAS project (extra.eas.projectId), whose registered slug is
// "selftend". The slug must match that project, so it does NOT change per variant - the dev
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
// Web origin whose /auth-callback links should open the installed app (verified
// App Links, issue #183). Falls back to the production origin so a plain
// `npx expo prebuild` still produces the correct release manifest.
const publicAppHost = new URL(process.env.EXPO_PUBLIC_PUBLIC_APP_URL ?? "https://selftend.org")
  .hostname;
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
  version: appVersion,
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: appScheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    // iOS rejects an app icon with an alpha channel, and `assets/icon.png` is
    // 42.5% fully transparent with clear corners. Expo flattens such an icon
    // onto WHITE, which would put the mark on a white tile while every other
    // surface uses the brand cream. This is the same artwork pre-composited
    // over #f4efe5 with no alpha, so iOS gets the intended background rather
    // than a default one.
    icon: "./assets/icon-ios.png",
    // No buildNumber: eas.json sets appVersionSource "remote", so EAS owns
    // CFBundleVersion and a value here is ignored (the same reason
    // android.versionCode is managed remotely). `eas build:version:set` seeds it.
    bundleIdentifier: iosBundleIdentifier,
    config: {
      // ITSAppUsesNonExemptEncryption=false. The binary links no non-exempt
      // crypto: entry encryption is server-side (pgcrypto, see the *_encrypt
      // migrations), and the only client-side crypto is OS-provided - the iOS
      // Keychain via expo-secure-store, plus HTTPS to Supabase. Both are exempt
      // categories. Re-check this if the app ever encrypts locally itself.
      //
      // Load-bearing, not cosmetic: Expo does not default this key, and
      // `eas build --non-interactive` only warns when it is absent. A build
      // would upload and then sit in App Store Connect as "Missing Compliance",
      // untestable, until someone answered the encryption question by hand.
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f4efe5",
    },
    package: androidPackage,
    versionCode: 1,
    // The AsyncStorage query cache holds decrypted entries; user data must
    // never land in Google cloud backups. Server-side data is the restore
    // path after reinstall.
    allowBackup: false,
    // Firebase config for FCM (Android push). One file per build variant, since the dev and
    // prod variants use different package names. Safe to commit (public identifiers only).
    googleServicesFile: isDevelopmentBuild
      ? "./google-services.dev.json"
      : "./google-services.json",
    // Verified App Links (issue #183): email-auth links are plain HTTPS on the
    // web origin ({{ .SiteURL }}/auth-callback...), so Android hands them to the
    // installed app only when the origin's /.well-known/assetlinks.json vouches
    // for this package (public/.well-known/assetlinks.json, served by the web
    // deploy). Production only: dev builds sign with throwaway debug keys that
    // assetlinks.json does not list, so verification could never succeed there.
    intentFilters: isDevelopmentBuild
      ? undefined
      : [
          {
            autoVerify: true,
            action: "VIEW",
            data: [{ scheme: "https", host: publicAppHost, pathPrefix: "/auth-callback" }],
            category: ["BROWSABLE", "DEFAULT"],
          },
        ],
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
    // SDK 56 removed the top-level `splash` key; the plugin is the only way.
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#f4efe5",
        // Without this, a dark-mode cold launch flashes the cream light-mode
        // splash before the app paints its dark background. #15121c is the
        // app's own dark background, converted from `.dark { --background: 260
        // 20% 9% }` in global.css - keep the two in step if that token moves.
        // The mark is a transparent PNG, so the same artwork composites over
        // either background.
        dark: {
          image: "./assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#15121c",
        },
      },
    ],
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
          label: w.label,
          description: w.description,
          minWidth: w.size.minWidth,
          minHeight: w.size.minHeight,
          maxResizeWidth: w.size.maxWidth,
          maxResizeHeight: w.size.maxHeight,
          targetCellWidth: w.size.targetCellWidth,
          targetCellHeight: w.size.targetCellHeight,
          resizeMode: w.size.resizeMode,
          previewImage: "./assets/widget-preview/moodcheckin.png",
          updatePeriodMillis: 0,
          ...(w.widgetFeatures ? { widgetFeatures: w.widgetFeatures } : {}),
        })),
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf",
        ],
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        organization: "selftend",
        project: "selftend",
        // EU-region Sentry org (DSN host is ingest.de.sentry.io). This URL is used by
        // sentry-cli for source-map upload; it must be the EU endpoint, not sentry.io.
        url: "https://de.sentry.io/",
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
