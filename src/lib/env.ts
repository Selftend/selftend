export const appEnv = {
  githubRepoUrl:
    process.env.EXPO_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/vasilyoshev/mental-health",
  publicAppUrl: process.env.EXPO_PUBLIC_PUBLIC_APP_URL ?? "",
  privacyEmail: process.env.EXPO_PUBLIC_PRIVACY_EMAIL ?? "",
  securityEmail: process.env.EXPO_PUBLIC_SECURITY_EMAIL ?? "",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

export const hasSupabaseConfig = Boolean(appEnv.supabaseUrl && appEnv.supabaseKey);
