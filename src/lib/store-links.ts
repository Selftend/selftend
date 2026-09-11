import { appEnv } from "@/src/lib/env";

/**
 * Tagged store links for the web-facing surfaces (#2324, `docs/measurement.md`
 * § 5).
 *
 * A visitor who clicks through from the website to Google Play or the App Store
 * arrives carrying a source tag, so the store consoles can report which surface
 * sent them. ☠️ The constraint was never that the consoles suppress this:
 * untagged links are roughly 65% of Play and 80% of iOS acquisitions because
 * **nothing was ever labelled** (#2303).
 *
 * ☠️☠️ **These are deliberately separate from `appEnv.playStoreUrl` /
 * `appStoreUrl`, and the bare constants must stay bare.** Those feed four
 * consumers, and one of them - `use-update-availability` - opens the store
 * *from inside the installed app*. A tag there would inject every updating user
 * into the very dimension this scheme exists to read, which is the one way to
 * make the number worse than having none.
 *
 * ⚠️ Tagging does not admit the Play Install Referrer API, which stays refused
 * on principle (`docs/measurement.md` § 3.3), and it does not convert a
 * standing surface into a pursued one: **a tagged standing surface's number is
 * read, never used to keep or cut it.**
 */

/**
 * The source vocabulary. Lowercase-hyphenated, **naming the surface, not the
 * platform**, and at most {@link STORE_LINK_SOURCE_MAX_LENGTH} characters so one
 * string serves both Play's `utm_source` and Apple's `ct`.
 *
 * ☠️ **A `web-` prefix means a visitor with no account can reach the surface; an
 * `app-` prefix means it only ever fires for somebody already using Selftend on
 * the web.** `app-support` and `app-user-menu` are named for themselves rather
 * than for a marketing surface on purpose: a marketing-style name would let
 * existing users read as fresh acquisitions. Named this way the number stays
 * legible - "existing web users who installed native" - instead of polluting
 * the channel vocabulary (owner ruling, 2026-09-11).
 *
 * ⚠️ **The ruling is about audience, not about one file.** Ask which prefix a
 * new surface takes before asking what to call it; the test cannot check that
 * for you, and a wrong prefix is invisible in the console.
 *
 * Adding one: keep the same shape, and prefer a name that says which surface a
 * reader of the console is looking at.
 */
export const STORE_LINK_SOURCES = {
  /** The Android-browser download bar on the public web app. */
  downloadBar: "web-download-bar",
  /** The "Get the app" section on the sign-in landing screen. */
  getTheApp: "web-get-the-app",
  /**
   * The "Get the app" section in the signed-in user menu.
   *
   * ☠️ **The same component, a different audience, and that is why it needs its
   * own source.** `GetTheAppSection` mounts twice: on the sign-in landing,
   * reached by a visitor with no account, and here, which only ever renders for
   * somebody already using Selftend on the web. One `web-` name across both
   * would put existing users into the visitor number - the failure the ruling
   * below names, applied to a second surface (#2324).
   */
  userMenu: "app-user-menu",
  /** The Support screen's store rows - internal by name, see above. */
  support: "app-support",
} as const;

export type StoreLinkSource = (typeof STORE_LINK_SOURCES)[keyof typeof STORE_LINK_SOURCES];

/** App Store Connect's own cap on a campaign token, and the tighter of the two. */
export const STORE_LINK_SOURCE_MAX_LENGTH = 30;

function withParam(base: string, param: string, value: string): string {
  // An unconfigured store is absent, not "coming soon" (see `appEnv`): a fork
  // that opted out must not be handed `?ct=...` hanging off an empty string.
  if (!base) return "";
  return `${base}${base.includes("?") ? "&" : "?"}${param}=${value}`;
}

/**
 * The Play listing, tagged.
 *
 * ☠️☠️ **Play's UTM parameters ride URL-encoded inside `referrer=`, not as
 * top-level query params.** A hand-written `?utm_source=…` on a Play link
 * registers **nothing**, silently, and looks correct in review. That is the
 * whole reason this function exists rather than a template literal at each call
 * site.
 *
 * ⚠️ `utm_medium` is deliberately omitted - Play has no medium dimension. Do
 * not "fix" this.
 */
export function taggedPlayStoreUrl(source: StoreLinkSource, campaign?: string): string {
  const referrer = campaign
    ? `utm_source=${source}&utm_campaign=${campaign}`
    : `utm_source=${source}`;

  return withParam(appEnv.playStoreUrl.trim(), "referrer", encodeURIComponent(referrer));
}

/**
 * The App Store listing, tagged.
 *
 * ⚠️ **On Apple, `ct` is the campaign when one exists, else the source.** Apple
 * has one token where Play has two, so the campaign has to displace the source
 * rather than sit beside it. This only stays readable because campaign names are
 * self-identifying (`<source>-<start-month>`), which couples the naming rule to
 * this format: changing one breaks the other.
 *
 * ⚠️ `utm_medium` is omitted here too - Apple has no slot for it.
 */
export function taggedAppStoreUrl(source: StoreLinkSource, campaign?: string): string {
  return withParam(appEnv.appStoreUrl.trim(), "ct", encodeURIComponent(campaign ?? source));
}
