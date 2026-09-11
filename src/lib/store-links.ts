import { appEnv } from "@/src/lib/env";

/**
 * Tagged store links (`docs/measurement.md` § 5, decided on #2305 / #2324).
 *
 * A visitor who clicks through from a Selftend surface to Google Play or the
 * App Store arrives carrying a source tag, so the store consoles can report
 * which surface sent them. Nothing is collected here and nothing returns to
 * Selftend's database: the tag is a fact about our own link, read only in
 * Google's and Apple's consoles.
 *
 * ☠️☠️ **These helpers are separate from `appEnv.playStoreUrl` /
 * `appEnv.appStoreUrl` on purpose, and the bare constants must stay bare.**
 * Those constants feed four consumers, and one of them -
 * `use-update-availability` - opens the store *from inside the installed app*.
 * Tagging them would inject every updating user into the very dimension this
 * scheme exists to read, indistinguishable from a real arrival.
 * `store-links.test.ts` pins that the bare constants carry no tag.
 *
 * ⚠️ `utm_medium` is deliberately omitted: Play has no medium dimension and
 * Apple has no slot for one. Do not "fix" this.
 */

/**
 * The source vocabulary. **A human choosing a new tag starts here**, and the
 * rules are:
 *
 * - lowercase-hyphenated, **naming the surface, not the platform** - `r-selftend`
 *   is not `r-bulgaria`, because the release machine posts to the project's own
 *   subreddit and a flat `reddit` would merge existing users into the
 *   acquisition number;
 * - **≤ 30 characters**, so one string serves both Play's `utm_source` and
 *   Apple's `ct`;
 * - a `web-` prefix for a surface a visitor without an account can reach, an
 *   `app-` prefix for one that only fires for somebody **already using
 *   Selftend on the web**. Without that split, existing web users installing
 *   the native app would read as fresh acquisitions (owner ruling, 2026-09-11).
 *
 * Only the in-app surfaces live in this file. Hand-written links - the GitHub
 * README, Reddit, YouTube, AlternativeTo - carry `github-readme`, `r-selftend`,
 * `r-bulgaria`, `youtube` and `alternativeto`, and the table in
 * `docs/measurement.md` § 5 is where those are recorded.
 */
export const STORE_LINK_SOURCES = {
  /** The Android mobile-web download bar, on the landing and auth screens. */
  webDownloadBar: "web-download-bar",
  /** The Get-the-app block on the sign-in landing screen. */
  webAuthLanding: "web-auth-landing",
  /** The Get-the-app block in the signed-in user menu. Internal, not an arrival. */
  appUserMenu: "app-user-menu",
  /** The Support screen's store rows. Internal, not an arrival. */
  appSupport: "app-support",
} as const;

export type StoreLinkSource = (typeof STORE_LINK_SOURCES)[keyof typeof STORE_LINK_SOURCES];

function appendParameter(url: string, parameter: string): string {
  const base = url.trim();
  // An unconfigured store is absent, not "a bare tag": every calling surface
  // gates its own visibility on the URL being truthy, so keep it falsy.
  if (!base) return "";
  return `${base}${base.includes("?") ? "&" : "?"}${parameter}`;
}

/**
 * ☠️☠️ **Play's UTM parameters ride URL-encoded inside a single `referrer=`
 * value, never as top-level query params.** A hand-written `?utm_source=…` on
 * a Play link registers **nothing**, silently, and looks correct in review.
 */
export function taggedPlayStoreUrl(
  source: StoreLinkSource,
  baseUrl: string = appEnv.playStoreUrl,
): string {
  return appendParameter(baseUrl, `referrer=${encodeURIComponent(`utm_source=${source}`)}`);
}

/**
 * Apple's parameters are top-level, and `ct` is the single free-text token:
 * **the campaign when one exists, else the source**. ⚠️ That works only because
 * campaign names are self-identifying, so the naming rule above and this format
 * are coupled - changing one breaks the other.
 *
 * ⚠️ **Unverified:** App Store Connect's own generated campaign links also
 * carry a `pt` provider token, which is minted console-side when a campaign is
 * created. Whether a `ct` on its own attributes is not something this repo can
 * check; it is a question for the first store read that follows shipping, not
 * an argument for adding a token nobody has yet.
 */
export function taggedAppStoreUrl(
  source: StoreLinkSource,
  baseUrl: string = appEnv.appStoreUrl,
): string {
  return appendParameter(baseUrl, `ct=${encodeURIComponent(source)}`);
}
