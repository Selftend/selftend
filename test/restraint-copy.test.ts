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
 */
const ALLOWED: { locale: Locale; keyPattern: RegExp }[] = [
  { locale: "en", keyPattern: /^recovery\.maintenanceCommitmentsHint$/ },
  { locale: "bg", keyPattern: /^recovery\.maintenanceCommitmentsHint$/ },
];

type Locale = "en" | "bg";

const LOCALES: Locale[] = ["en", "bg"];

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
      .filter(
        ({ key }) =>
          !ALLOWED.some((allowed) => allowed.locale === locale && allowed.keyPattern.test(key)),
      )
      .map(({ namespace, key, text }) => `${namespace}:${key} - ${text}`);

    expect(offenders).toEqual([]);
  });

  it("every allowlisted key still exists, so a stale exemption cannot hide a new offence", () => {
    // An allowlist that outlives its string silently widens itself: the entry stops
    // matching anything and nobody notices the rule is now unguarded there.
    for (const { locale, keyPattern } of ALLOWED) {
      const matches = STRINGS[locale].filter(({ key }) => keyPattern.test(key));
      expect(matches.length).toBeGreaterThan(0);
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
