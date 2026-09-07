import { Platform } from "react-native";

export const appEnv = {
  githubRepoUrl: process.env.EXPO_PUBLIC_GITHUB_REPO_URL ?? "https://github.com/Selftend/selftend",
  // Both apps are published, so the live listings are the default - a build that
  // was handed no store config still points at a real store, the way the Discord
  // and Sponsors links do. A fork sets its own URL, or an empty string to drop the
  // store surfaces entirely; a self-hoster must never ship a link to someone
  // else's listing. Empty is "this build has no store", not "coming soon".
  playStoreUrl:
    process.env.EXPO_PUBLIC_PLAY_STORE_URL ??
    "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend",
  appStoreUrl:
    process.env.EXPO_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/app/selftend/id6796318929",
  discordUrl: process.env.EXPO_PUBLIC_DISCORD_URL ?? "https://discord.gg/pdaAr9FhcQ",
  redditUrl: process.env.EXPO_PUBLIC_REDDIT_URL ?? "https://www.reddit.com/r/Selftend/",
  // The one donation path (#1625, decided 2026-09-02): GitHub Sponsors on the
  // maintainer's personal account. A fork sets its own URL, or an empty string to
  // drop the Donate row - a self-hoster must never ship a link to someone else's page.
  sponsorsUrl: process.env.EXPO_PUBLIC_SPONSORS_URL ?? "https://github.com/sponsors/vasilyoshev",
  youtubeUrl: process.env.EXPO_PUBLIC_YOUTUBE_URL ?? "https://www.youtube.com/@Selftend",
  publicAppUrl: process.env.EXPO_PUBLIC_PUBLIC_APP_URL ?? "",
  // These three stay `?? ""` rather than joining the defaulted URLs above, and
  // the difference is deliberate (#2131). A link and an address fail in opposite
  // directions: an unset store URL should still reach a real listing, because the
  // worst case is a reader visiting someone else's page. An unset contact address
  // must stay legible AS unset to the surfaces that can honestly say so - the
  // support row, the feedback form - because the worst case is a stranger sending
  // their own deletion request to an operator who cannot action it.
  //
  // Published policy prose cannot say "unset", so it resolves through
  // `contactEmails()` below instead of reading these directly.
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

/**
 * This project's own contact addresses - the fallback published prose uses when a
 * build configured none.
 *
 * They live here rather than in `policies.json` because they are configuration
 * wearing copy's clothes (#2131). Written into the locale files they existed
 * twice under two sourcing rules, so a fork that set `EXPO_PUBLIC_SUPPORT_EMAIL`
 * got its own address on `/support` and `support@selftend.org` in the FAQ and the
 * parents letter - an address reaching us, in a document telling a stranger where
 * to send their data-deletion request.
 */
export const projectContactEmails = {
  privacy: "privacy@selftend.org",
  security: "security@selftend.org",
  support: "support@selftend.org",
} as const;

/**
 * The addresses published prose names, as i18next interpolation values.
 *
 * Falls back to {@link projectContactEmails} rather than rendering nothing,
 * because prose cannot hide a clause the way a row can: `/support` drops its
 * email row when the address is unset, but "write to  with what you can tell us"
 * is not an option, and a privacy policy that names no controller contact is a
 * broken document rather than a configurable one. A fork that sets nothing
 * therefore ships ours - loudly, via `validateRequiredEnv` - which is strictly
 * better than a reader with no route at all.
 *
 * A function, not a constant: `appEnv` is a plain mutable object that tests
 * assign to, and a module-level derivation would freeze the value at import.
 */
export function contactEmails() {
  return {
    privacyEmail: appEnv.privacyEmail || projectContactEmails.privacy,
    securityEmail: appEnv.securityEmail || projectContactEmails.security,
    supportEmail: appEnv.supportEmail || projectContactEmails.support,
  };
}

function isProductionBuild() {
  return process.env.NODE_ENV === "production";
}

export function validateRequiredEnv() {
  if (!appEnv.supabaseUrl || !appEnv.supabaseKey) {
    console.error(
      "[env] EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set. Auth features are disabled.",
    );
  }

  // Deliberately ahead of the `publicAppUrl` block, which returns early on a
  // production web build: placed after it, this warning would be the one thing a
  // misconfigured deployment never hears.
  //
  // The point of the warning is that shipping ours is silent otherwise (#2131).
  // `contactEmails()` keeps published prose honest by falling back, and a fork
  // that never set these has no other way to learn that its privacy policy is
  // pointing data-deletion requests at somebody else's inbox.
  const unsetContactVars = [
    !appEnv.privacyEmail && "EXPO_PUBLIC_PRIVACY_EMAIL",
    !appEnv.securityEmail && "EXPO_PUBLIC_SECURITY_EMAIL",
    !appEnv.supportEmail && "EXPO_PUBLIC_SUPPORT_EMAIL",
  ].filter((name): name is string => Boolean(name));

  if (isProductionBuild() && unsetContactVars.length) {
    console.warn(
      `[env] ${unsetContactVars.join(", ")} not set. Policy and FAQ copy will publish this project's own contact addresses (${projectContactEmails.support} and siblings), which reach the Selftend maintainers rather than this deployment's operator. Set them before shipping a fork.`,
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
