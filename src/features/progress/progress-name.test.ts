import enNavigation from "@/src/i18n/locales/en/navigation.json";
import bgNavigation from "@/src/i18n/locales/bg/navigation.json";

/**
 * One screen, one name (#1903).
 *
 * ☠️ This pins the INVARIANT, not three values. `/progress` shipped calling
 * itself `Insights` in the sidebar and the header while the breadcrumb said
 * `Reflect` — two visible names for one screen, and the kind of defect that
 * survives because each string looks fine on its own. Asserting the three keys
 * against each other is what makes a future edit to any ONE of them fail.
 *
 * ⚠️ Written because reverting the breadcrumb alone passed the whole suite:
 * the acceptance criterion said all three must land together, and nothing
 * enforced it.
 *
 * The value is asserted for `en` only. `bg` is Weblate-managed, so its column
 * is checked for INTERNAL agreement rather than against a literal a translator
 * is entitled to change.
 */
const LOCALES = {
  en: enNavigation,
  bg: bgNavigation,
} as const;

describe("the /progress screen's name", () => {
  it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])(
    "is one string in %s — sidebar, header and breadcrumb agree",
    (locale) => {
      const nav = LOCALES[locale];

      expect(nav.progress.title).toBe(nav.sidebar.progress);
      expect(nav.breadcrumb.progress).toBe(nav.sidebar.progress);
    },
  );

  it("is `Looking back` in en", () => {
    expect(enNavigation.sidebar.progress).toBe("Looking back");
  });

  /**
   * The retired names are gone from the three keys that named this screen.
   *
   * ⚠️ Scoped to those three deliberately. Asserting the retired words are
   * absent from the WHOLE namespace would outlive its reason: an unrelated
   * future key legitimately valued `Reflect` would fail a test about
   * `/progress`. `Insights` in particular still ships as a heading inside the
   * CBT dashboard and the gratitude log, which are different surfaces.
   */
  it("keeps neither retired name on any of the three keys", () => {
    for (const value of [
      enNavigation.sidebar.progress,
      enNavigation.progress.title,
      enNavigation.breadcrumb.progress,
    ]) {
      expect(value).not.toBe("Insights");
      expect(value).not.toBe("Reflect");
    }
  });

  /**
   * ☠️ The debt frame, deleted rather than rewritten. "Log a mood to start your
   * trend." is an imperative wrapped around a claim that the person owes a
   * trend — the shape #1838 forbids — so no empty state replaced it.
   */
  it("carries no mood-trend keys at all", () => {
    for (const nav of Object.values(LOCALES)) {
      const progress = nav.progress as Record<string, unknown>;

      expect(progress.moodTrend).toBeUndefined();
      expect(progress.moodTrendDescription).toBeUndefined();
      expect(progress.noMoodData).toBeUndefined();
    }
  });
});
