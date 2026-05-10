import { Platform } from "react-native";

export const appEnv = {
  githubRepoUrl: process.env.EXPO_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/Selftend/selftend",
  publicAppUrl: process.env.EXPO_PUBLIC_PUBLIC_APP_URL ?? "",
  privacyEmail: process.env.EXPO_PUBLIC_PRIVACY_EMAIL ?? "",
  securityEmail: process.env.EXPO_PUBLIC_SECURITY_EMAIL ?? "",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  webPushVapidPublicKey: process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
};

export const hasSupabaseConfig = Boolean(appEnv.supabaseUrl && appEnv.supabaseKey);

function isProductionBuild() {
  return process.env.NODE_ENV === "production";
}

export function validateRequiredEnv() {
  if (!appEnv.supabaseUrl || !appEnv.supabaseKey) {
    console.error(
      "[env] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set. Auth features are disabled.",
    );
  }

  if (Platform.OS === "web" && !appEnv.publicAppUrl) {
    const message =
      "[env] EXPO_PUBLIC_PUBLIC_APP_URL is not set. Local web auth will use the Expo dev server callback. Set it before exporting or deploying production web builds.";

    if (isProductionBuild()) {
      console.error(message);
      return;
    }

    console.warn(message);
  }

  if (Platform.OS === "web" && isProductionBuild() && !appEnv.webPushVapidPublicKey) {
    console.warn(
      "[env] EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY is not set. Web reminder notifications are disabled for this deployment.",
    );
  }
}
