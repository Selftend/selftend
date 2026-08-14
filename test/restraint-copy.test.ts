import fs from "fs";
import path from "path";

/**
 * `show the record, don't read it` (#711), and its companion: **the framework may
 * talk about missing, the product may not advertise its own restraint.**
 *
 * Naming the absent punishment is what puts it in the room. "There is no penalty
 * for missing a day" tells a user their missed day was the kind of thing that
 * *could* have been penalised.
 *
 * #763 fixed four such strings and left a guard behind - scoped to the `habits`
 * namespace, with a docstring predicting "the next copy change will be somewhere
 * else." It was: the FAQ answer to *"Are reminders annoying?"* said the same thing
 * in `policies`, and the guard could not see it (#805). A sweep from here also
 * found a sixth in `cbt`.
 *
 * So this guard reads **every namespace in both locales**. A namespace-scoped
 * version of this test has now been wrong twice.
 */
const RESTRAINT_CLAIMS: { locale: Locale; pattern: RegExp }[] = [
  { locale: "en", pattern: /no shame/i },
  { locale: "en", pattern: /\bshaming\b/i },
  { locale: "en", pattern: /never punish/i },
  { locale: "en", pattern: /punishes/i },
  { locale: "en", pattern: /punishment/i },
  { locale: "en", pattern: /no penalty/i },
  { locale: "en", pattern: /not (a )?failure/i },
  /**
   * The third form of the #711 violation, after *shame* (#763) and *punishment* (#805).
   * #952 claimed this guard already forbade it — it did not (#963).
   *
   * ☠️ The pattern is the NEGATION, never the noun. *Pressure* is also a physical
   * sensation and the grounding content uses it correctly ("Notice the pressure and
   * texture", "(temperature, texture, pressure)"), as does the breathing help text in bg
   * ("освобождава напрежение" — releases tension). A `/pressure/i` guard would forbid
   * teaching a grounding technique.
   *
   * ⚠️ bg needs the SYNONYM too. `routines:home.subtitle` read "без напрежение", which
   * the obvious `натиск`-only pattern walks straight past — the same string in en said
   * "no pressure", so a locale-blind reading would have called bg clean.
   */
  { locale: "en", pattern: /no pressure/i },
  { locale: "en", pattern: /create pressure/i },
  { locale: "bg", pattern: /без\s+(?:\S+\s+)?(натиск|напрежени)/i },
  { locale: "bg", pattern: /създава\w*\s+натиск/i },
  { locale: "bg", pattern: /без срам/i },
  { locale: "bg", pattern: /не наказва/i },
  { locale: "bg", pattern: /наказва(ме|ш|т)?\b/i },
  { locale: "bg", pattern: /наказание/i },
  { locale: "bg", pattern: /не провал/i },
];

/**
 * Known remaining instances, each awaiting an owner's copy call.
 *
 * This is an allowlist, not an exemption: every entry is a string that still
 * breaks the rule. It exists so the guard can go app-wide **today** without
 * silently rewriting copy on surfaces whose wording is not this change's to
 * decide. Removing an entry is the fix; adding one needs a reason.
 *
 * - `cbt:recovery.maintenanceCommitmentsHint` - "Small practices you want to keep,
 *   without pressure or punishment." / "без натиск или наказание". Same shape as
 *   the four #763 rewrote, on a surface #805 did not cover. Tracked separately.
 *
 * It is the ONLY remaining offender across all twenty namespaces in both locales.
 *
 * Each entry names its **namespace** as well as its key. A key-only entry would
 * exempt the same dotted path in every other namespace too - a namespace blind
 * spot inside the guard built to remove one.
 */
const ALLOWED: { locale: Locale; namespace: string; keyPattern: RegExp }[] = [
  { locale: "en", namespace: "cbt", keyPattern: /^recovery\.maintenanceCommitmentsHint$/ },
  { locale: "bg", namespace: "cbt", keyPattern: /^recovery\.maintenanceCommitmentsHint$/ },
];

function isAllowed(locale: Locale, namespace: string, key: string) {
  return ALLOWED.some(
    (allowed) =>
      allowed.locale === locale && allowed.namespace === namespace && allowed.keyPattern.test(key),
  );
}

type Locale = "en" | "bg";

/** Every leaf string in a namespace, keyed by its dotted path. */
function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => flatten(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

function localeDir(locale: Locale) {
  return path.join(__dirname, "..", "src", "i18n", "locales", locale);
}

/** Read the namespaces off disk so a newly-added one is covered without an import. */
function loadLocale(locale: Locale): { namespace: string; key: string; text: string }[] {
  const dir = localeDir(locale);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const namespace = file.replace(/\.json$/, "");
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return flatten(parsed).map(([key, text]) => ({ namespace, key, text }));
    });
}

const STRINGS: Record<Locale, ReturnType<typeof loadLocale>> = {
  en: loadLocale("en"),
  bg: loadLocale("bg"),
};

describe("product copy states the record instead of advertising restraint", () => {
  it("reads every namespace, so a new one is covered the day it is added", () => {
    const namespaces = new Set(STRINGS.en.map((entry) => entry.namespace));

    // The two surfaces this guard was blind to, plus the one it already covered.
    expect(namespaces).toContain("habits");
    expect(namespaces).toContain("policies");
    expect(namespaces).toContain("cbt");
    expect(namespaces.size).toBeGreaterThanOrEqual(20);
  });

  it.each(RESTRAINT_CLAIMS)("$locale copy never matches $pattern", ({ locale, pattern }) => {
    const offenders = STRINGS[locale]
      .filter(({ text }) => pattern.test(text))
      .filter(({ namespace, key }) => !isAllowed(locale, namespace, key))
      .map(({ namespace, key, text }) => `${namespace}:${key} - ${text}`);

    expect(offenders).toEqual([]);
  });

  it("every allowlisted entry still breaks a rule, so a stale exemption cannot hide a new offence", () => {
    // Two ways an exemption goes stale, and both silently unguard that key:
    //
    // 1. The key is deleted - the entry stops matching anything.
    // 2. The COPY is fixed but the key is kept - the entry still matches a real
    //    string, which now complies, so the exemption sits there ready to cover
    //    whatever wording lands at that key next.
    //
    // Requiring each entry to still match a restraint pattern catches both: fixing
    // the text forces the exemption to be removed in the same change.
    for (const { locale, namespace, keyPattern } of ALLOWED) {
      const matches = STRINGS[locale].filter(
        (entry) => entry.namespace === namespace && keyPattern.test(entry.key),
      );
      expect(matches.length).toBeGreaterThan(0);

      const patterns = RESTRAINT_CLAIMS.filter((claim) => claim.locale === locale);
      const stillOffending = matches.filter(({ text }) =>
        patterns.some(({ pattern }) => pattern.test(text)),
      );
      expect(stillOffending.length).toBeGreaterThan(0);
    }
  });

  it("the FAQ answers 'Are reminders annoying?' with control, not with an absent penalty (#805)", () => {
    const answer = STRINGS.en.find(
      ({ namespace, text }) =>
        namespace === "policies" && text.startsWith("They are off by default."),
    );

    expect(answer).toBeDefined();
    // What the user can do...
    expect(answer?.text).toMatch(/turn them off anytime/i);
    // ...and not what the product declines to do.
    expect(answer?.text).not.toMatch(/penalty|shame/i);
  });
});
