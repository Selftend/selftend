import { computeBreadcrumbs } from "@/src/lib/breadcrumbs";
import i18n, { type SupportedLanguage } from "@/src/i18n";
import { setLanguage } from "@/test/i18n-language";

/**
 * The trail's labels come from table VALUES - `t(STATIC_ROUTES[path])` and the
 * `SLUG_LABEL_KEYS` templates - never from a string literal at the call site.
 * `test/i18n-key-coverage.test.ts` scans for literal `t("…")`, so it cannot see
 * any of them: rename `act:choicePoint.title` and every static guard stays green.
 *
 * That blindness has already cost this repo once. In #876 an unclaimed segment
 * rode a slug template into a key that did not exist and the trail rendered the
 * RAW UPPERCASED KEY to users. This resolves the labels through the real
 * resource bundles instead of a fake `t`, in both shipped locales, so a rename
 * or a missing translation fails here rather than on screen.
 */

// One path per label the trail resolves through a table, weighted to the
// cross-namespace ones (`act:`, `habits:`, `cbt:`) that no other test touches.
const PATHS = [
  "/modules/act/choice-point",
  "/modules/act/connection/drop-anchor",
  "/modules/cbt/saved",
  "/tools/habits/learn/compounding",
  "/tools/habits/learn/two-minute-rule",
  "/tools/breathing/box-breathing",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/update-password",
  "/verify-email",
  "/auth-callback",
  "/notifications",
  "/modules/cbt/goals/3f9a-uuid",
  "/routines/3f9a-uuid/edit",
];

// An unresolved i18n key comes back as the key itself: `act:choicePoint.title`,
// `breadcrumb.saved`. Neither shape can be a real label - a label never carries
// a namespace colon, and never reads as dotted lowerCamel with no spaces.
function looksLikeAKey(label: string): boolean {
  return /^[a-z][a-zA-Z]*:/.test(label) || /^[a-z][a-zA-Z]*(\.[a-zA-Z]+)+$/.test(label);
}

describe.each(["en", "bg"])("breadcrumb labels resolve in %s", (language) => {
  beforeAll(async () => {
    // ☠️ Through the helper, NEVER a bare `i18n.changeLanguage("bg")`: only `en`
    // is registered at init and bg's bundles are added lazily, so on its own the
    // switch leaves every lookup falling through `fallbackLng: "en"`. This suite
    // ran its whole "bg" half against English copy until #1253 - a missing
    // Bulgarian crumb label could not have failed it.
    await setLanguage(language as SupportedLanguage);
  });

  afterAll(async () => {
    await setLanguage("en");
  });

  it.each(PATHS)("resolves every crumb on %s to real copy", (path) => {
    const t = i18n.getFixedT(language, "navigation");
    const crumbs = computeBreadcrumbs(path, t as (key: string) => string);

    expect(crumbs.length).toBeGreaterThan(0);
    for (const crumb of crumbs) {
      expect(crumb.label).not.toBe("");
      expect(looksLikeAKey(crumb.label)).toBe(false);
    }
  });
});
