/**
 * The one serving origin, for the tags that name a page's address - `og:url`
 * and `<link rel="canonical">` (`docs/indexability.md` § 4.1, § 6.1).
 *
 * Hardcoded on purpose. Not `EXPO_PUBLIC_PUBLIC_APP_URL`: that is an app-links
 * value that can legitimately diverge (the e2e server pins it to localhost, a
 * staging deploy to the staging host), and a canonical must point at
 * production from every mirror. Not expo-router's `origin` either, for the
 * same reason.
 */
export const SITE_ORIGIN = "https://selftend.org";

/**
 * The canonical URL of a route path.
 *
 * The root carries its slash - an origin's root path is always `/`, and the
 * structured-data ruling already wrote it so. Every other path carries none:
 * `/faq`, never `/faq/`, so the canonical and the sitemap agree byte for byte
 * with the URL the host serves.
 */
export function canonicalUrl(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  if (trimmed === "") {
    return `${SITE_ORIGIN}/`;
  }
  return `${SITE_ORIGIN}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
