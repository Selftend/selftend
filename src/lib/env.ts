export const appEnv = {
  githubRepoUrl:
    process.env.EXPO_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/vasilyoshev/mental-health",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

export const hasSupabaseConfig = Boolean(appEnv.supabaseUrl && appEnv.supabaseKey);
