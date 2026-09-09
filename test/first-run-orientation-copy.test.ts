import { MODULES } from "@/src/features/favorites/items";
import { LOCALE_STRINGS, type Locale } from "@/test/locale-strings";

/**
 * **The first-run panel is where the orientation copy lives** (#2095, #2111).
 *
 * Until this landed, the two things a first-time reader needs in order to choose -
 * which half of the app to start in, and whether starting in one rules out the other -
 * were written only on `/modules`, in `navigation:modulesPage.whereToStart`. That page
 * is being deleted (#2114), so the guidance moves - first, so that it is never homeless -
 * to somewhere a person actually passes through, and the first-run panel is the one
 * surface everyone sees exactly once.
 *
 * Two different regressions are guarded here, because they fail in opposite directions:
 *
 * - The guidance **going missing again**. Once `/modules` is gone there is no second
 *   copy of it anywhere, and losing it is invisible - the panel still reads as a
 *   perfectly sensible welcome. Pinned by value, per locale.
 * - The module list **going stale**. The panel named "CBT or ACT" for the whole of
 *   DBT's life, because nothing connected the sentence to the set of shipped modules.
 *   Derived from `MODULES` rather than restated, so a fourth module fails here on the
 *   day it lands rather than the day someone rereads the welcome copy.
 *
 * ☠️ The acronym is read per locale out of `routines:form.groups.<key>` rather than
 * from `MODULES.abbreviation`, because bg ships **КПТ** for CBT and **ДПТ** for DBT
 * beside a Latin `ACT`. Asserting `abbreviation` in both locales would demand a Latin
 * "CBT" in Bulgarian copy - the one spelling the app has never used.
 *
 * ⚠️ It used to read `navigation:sidebar.<key>`, and that encoded #2191: the sidebar
 * label is the one slot where the DBT spec (§8.6) lets bg keep Latin `DBT`, so reading
 * the acronym from there demanded "КПТ, ACT или DBT" in body copy - the mixed line the
 * issue was filed on. `routines:form.groups` is body copy in both locales, which is
 * what the welcome panel is; `test/bg-dbt-abbreviation.test.ts` pins the rule itself.
 */
/**
 * Throws rather than returning `undefined`, so a key that is renamed away fails here
 * loudly instead of turning every assertion below it into a comparison against nothing.
 */
function value(locale: Locale, namespace: string, key: string): string {
  const entry = LOCALE_STRINGS[locale].find((s) => s.namespace === namespace && s.key === key);
  if (!entry) throw new Error(`${namespace}:${key} is missing from ${locale}`);
  return entry.text;
}

const panelBody = (locale: Locale) => value(locale, "settings", "onboarding.appBody1");

/** The module's name as this locale's body copy writes it: `КПТ` / `ACT` / `ДПТ` in bg. */
const acronym = (locale: Locale, module: string) =>
  value(locale, "routines", `form.groups.${module}`);

/**
 * The retired two-item list, and the string it was retired from.
 *
 * The witness is the point: `not.toContain("CBT or ACT")` is also satisfied by the
 * panel copy being rewritten past recognition, or deleted - it would keep passing
 * while saying nothing. Matching the pattern against the value it was written for
 * proves the check still has teeth.
 */
const STALE_LIST: Record<Locale, { pattern: string; retired: string }> = {
  en: {
    pattern: "CBT or ACT",
    retired: "Modules - CBT or ACT - take you step by step",
  },
  bg: {
    pattern: "КПТ или ACT",
    retired: "Модулите - КПТ или ACT - те водят стъпка по стъпка",
  },
};

/**
 * The rescued halves of `modulesPage.whereToStart`, as the panel now says them.
 *
 * Pinned as two separate fragments rather than one sentence, because they answer two
 * different questions and a rewrite that keeps only the routing half would leave the
 * person who wants to use both with no answer - which is the failure `/modules` used
 * to prevent.
 */
const GUIDANCE: Record<Locale, { routing: string; mixing: string }> = {
  en: {
    routing:
      "The tools help with general wellbeing; try CBT if difficult thoughts are your main concern.",
    mixing: "Mixing is fine.",
  },
  bg: {
    routing:
      "Инструментите помагат за общото благосъстояние; пробвай КПТ, ако трудните мисли са основният ти проблем.",
    mixing: "Спокойно можеш да комбинираш.",
  },
};

describe("the first-run panel carries the orientation copy", () => {
  it.each(["en", "bg"] as const)("%s names every shipped module", (locale) => {
    const body = panelBody(locale);
    const missing = MODULES.map(({ key }) => acronym(locale, key)).filter(
      (name) => !body.includes(name),
    );

    expect(missing).toEqual([]);
  });

  it.each(["en", "bg"] as const)("%s no longer carries the stale two-item list", (locale) => {
    const { pattern, retired } = STALE_LIST[locale];

    // The witness: the pattern still recognises the copy it was written against.
    expect(retired).toContain(pattern);
    expect(panelBody(locale)).not.toContain(pattern);
  });

  it.each(["en", "bg"] as const)(
    "%s answers where to start and that mixing is allowed",
    (locale) => {
      const body = panelBody(locale);

      expect(body).toContain(GUIDANCE[locale].routing);
      expect(body).toContain(GUIDANCE[locale].mixing);
    },
  );
});
