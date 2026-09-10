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
 * The site's name as the head states it - `og:site_name` and the
 * `Organization` and `WebSite` nodes of the structured data read this one
 * value (`docs/indexability.md` § 4.2, § 5), so the block cannot name a site
 * the page does not.
 */
export const SITE_NAME = "Selftend";

/**
 * The share image: the 512 px app icon, the only share-sized image the site
 * serves. `og:image` in the site head and `Organization.logo` in the
 * structured data are this one URL (§ 4.2, § 5); 512 px clears Google's
 * 112 px floor for a logo.
 */
export const SHARE_IMAGE_URL = `${SITE_ORIGIN}/favicon-512.png`;

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
