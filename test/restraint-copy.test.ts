import { LOCALE_STRINGS, type Locale, type LocaleString } from "@/test/locale-strings";

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
 *
 * ☠️ CONFIG SURFACES ARE DISCLOSURE; PRACTICE SURFACES ARE ADVERTISING
 * (#1662). On a configuration screen, stating the default and what a control
 * does answers a configuration question the user is standing in front of —
 * the settings and notifications descriptions ("off by default", the
 * routines steps note, `form.onDemandHelp`) are legal by that ruling. The
 * same sentence on a practice surface is restraint advertising. Before
 * adding a tempting pattern like `/no reminders/`, check which surface the
 * hits live on; its sibling `practice-copy.test.ts` records the same
 * exception.
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
  /**
   * ☠️ The mirror of the warning above, and it stayed open two rules longer. bg
   * has caught the `без <noun>` construction since #963; en only ever had the
   * `no <noun>` form - so **"without pressure" walked straight past this guard**
   * while "без натиск" was caught. The same locale-blind spot the note above
   * describes, pointing the other way.
   *
   * The string that proved it is the one #1342 rewrote: "…without pressure or
   * punishment." was caught ONLY by `/punishment/i`. Trim it to "…without
   * pressure." and the whole suite goes green on a live violation.
   *
   * Same shape as the bg pattern (one optional intervening word, so "without any
   * pressure" is caught) and, like it, keyed on the NEGATION rather than the
   * noun - bare "pressure" stays legal for the grounding content that teaches it.
   *
   * ☠️ `judgement` is DELIBERATELY not in this list, and must not be added.
   * "Without judgement" is the vocabulary of the technique itself, not the
   * product's voice - non-judgemental awareness is what body-scan and noticing
   * practices ARE. Including it failed three live strings, all of them correct:
   *   - `act:observingSelf.techniqueDescriptions.bodyAwareness` - "Notice
   *     sensations as a witness - without judgement or the urge to change anything."
   *   - `gratitude:onboarding.levels.level1Body` - "Simply report what happened
   *     today without judgement."
   *   - `meditation:practices.body-scan.instructions[3]` - "noticing sensation
   *     without judgement."
   *
   * ⚠️ Two of those three quoted the AMERICAN spelling until #1651 standardised
   * them; the citations are updated with the copy. A guard's rationale that
   * quotes strings which no longer exist is how the next reader concludes the
   * rationale is stale and deletes the rule.
   * That is the #711 rule working as written: the framework may talk about
   * missing, and it may teach non-judgement; only the product may not advertise
   * its own restraint. Same reasoning that keeps bare "pressure" legal above.
   */
  {
    locale: "en",
    pattern: /\bwithout\s+(?:\S+\s+)?(pressure|punishment|penalty|shame|scores?)/i,
  },
  /**
   * The fourth form, after *shame* (#763), *punishment* (#805) and *pressure*
   * (#963/#1342). `meditation:module.insights.subtitle` read "The last {{count}}
   * days of practice - no scores." — the product telling the user it does not
   * grade them, which is the "not keeping a streak" example #711 names outright.
   *
   * ☠️ The pattern is `no scores`, never bare `score`. A user's own mood number
   * is called a score all over `mood` and `cbt` ("Pick a mood score first.",
   * "Average score per day…"), and those are the record, not restraint about it.
   */
  { locale: "en", pattern: /\bno scores?\b/i },
  { locale: "bg", pattern: /без\s+(?:\S+\s+)?(натиск|напрежени)/i },
  /**
   * The bg half of `no scores`, and ☠️ **it must stay PLURAL**. In Bulgarian the
   * two senses split on number, and only one of them is the product's voice:
   *
   *   - `без оценки` (plural, countable) = *no grades* — the restraint claim.
   *   - `без оценка` / `без преценка` (singular, abstract) = *without judgement* —
   *     the vocabulary of the technique itself.
   *
   * A `без оценк` stem pattern fails two live, correct strings:
   * `meditation:practices.body-scan.instructions` ("забелязвайки усещанията без
   * оценка") and `gratitude:onboarding.levels.level1Body` ("без преценка"). That
   * is the same line the en list draws by leaving `judgment`/`judgement` out
   * deliberately — non-judgemental awareness is what these practices ARE.
   *
   * Bare `оценки` is also legal and stays legal: `act:*.saveAll` ("Запази
   * оценките") and `cbt:*.strengthTrackerDescription` name real ratings the user
   * gives. The negation is what makes it a restraint claim.
   *
   * ☠️ **No trailing `\b` on a Cyrillic pattern.** JavaScript's `\b` is defined
   * against ASCII `\w`, so between "оценки" and the "." that follows it there is
   * no word boundary at all — `/оценки\b/` matched NOTHING and the guard went
   * green on the very string it was written for. Caught only because this pattern
   * was added while the offending copy was still in the file.
   */
  { locale: "bg", pattern: /без\s+(?:\S+\s+)?оценки/i },
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
 * **It is now EMPTY, and that is the finished state (#1342).** The last entry was
 * `cbt:recovery.maintenanceCommitmentsHint` - "Small practices you want to keep,
 * without pressure or punishment." / "без натиск или наказание" - the sixth
 * instance, on the recovery-plan form that #805 did not cover. Its rewrite
 * retired the entry in the same change, which is exactly what the stale-exemption
 * test below exists to force.
 *
 * So every restraint pattern below now runs unexempted across all twenty
 * namespaces in both locales. An empty allowlist makes that test vacuous by
 * construction - there is nothing left to check - and that is the point: the
 * scan it guards is the one doing the work now.
 *
 * Each entry names its **namespace** as well as its key. A key-only entry would
 * exempt the same dotted path in every other namespace too - a namespace blind
 * spot inside the guard built to remove one.
 */
const ALLOWED: { locale: Locale; namespace: string; keyPattern: RegExp }[] = [];

function isAllowed(locale: Locale, namespace: string, key: string) {
  return ALLOWED.some(
    (allowed) =>
      allowed.locale === locale && allowed.namespace === namespace && allowed.keyPattern.test(key),
  );
}

const STRINGS = LOCALE_STRINGS;

/** Every string in `locale` whose text `pattern` matches. */
function matching(locale: Locale, pattern: RegExp) {
  return STRINGS[locale].filter(({ text }) => pattern.test(text));
}

/** Renders offenders for a failure message: which key said it, and what it said. */
function describeEntries(entries: LocaleString[]) {
  return entries.map(({ namespace, key, text }) => `${namespace}:${key} - ${text}`);
}

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
    // The allowlist applies HERE and not to the false-claim scan below: a
    // restraint phrasing can be a copy call still awaiting an owner, but a
    // sentence that misreports the user's own number is never exemptable.
    const offenders = matching(locale, pattern).filter(
      ({ namespace, key }) => !isAllowed(locale, namespace, key),
    );

    expect(describeEntries(offenders)).toEqual([]);
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

  /**
   * A neighbouring rule, guarded from the same place because the scanner is the
   * same: **the product may not read a number back to the user as a claim about
   * it.** #711's "show the record, don't read it" covers restraint copy; this is
   * the arithmetic form of the same mistake.
   *
   * `act:defusion.noFusionDrop` and `act:expansion.noIntensityDrop` said "Fusion
   * stayed at {{after}}" / "Intensity stayed at {{after}}" under a guard of
   * `after < before` - so **equal or higher** fell into the no-drop branch, and a
   * user whose fusion went 60 -> 70 was told it stayed at 70. Two strings, four
   * screens, both locales, and zero tests (#1367).
   *
   * The fix retired all four strings (the true `dropped from` halves included -
   * they restated two numbers already on the screen). This guard is what keeps a
   * corrected-but-still-interpreting sentence from being written back: there is
   * no wording of "stayed at" that a before/after pair needs.
   *
   * ⚠️ The bg patterns are the **phrasings**, not translations of the English
   * regex - `остана на` and `падна от` are what the retired strings actually
   * said. A locale-blind reading would have called bg clean.
   *
   * ⚠️ These four phrasings are restated as one regex in
   * `src/features/act/act-before-after-note-absent.test.tsx`, which scans the
   * four *rendered* screens rather than the JSON. A fifth phrasing belongs in
   * both places: this guard cannot see a sentence hardcoded in a component, and
   * that one cannot see a string no screen renders yet.
   */
  const BEFORE_AFTER_READINGS: { locale: Locale; pattern: RegExp }[] = [
    { locale: "en", pattern: /stayed at/i },
    { locale: "en", pattern: /dropped from/i },
    { locale: "bg", pattern: /остана на/i },
    { locale: "bg", pattern: /падна от/i },
  ];

  it.each(BEFORE_AFTER_READINGS)(
    "$locale copy never reads a before/after pair back as $pattern (#1367)",
    ({ locale, pattern }) => {
      expect(describeEntries(matching(locale, pattern))).toEqual([]);
    },
  );

  it("the retired 'stayed at' family is gone from both locales, not just from en (#1367)", () => {
    // Listed as four keys rather than two, because the family shipped as TWO
    // strings across FOUR screens: a sweep that fixed defusion and forgot
    // expansion left half the false claim in place, and nothing in the suite
    // could see it.
    const RETIRED_KEYS = [
      "defusion.fusionDrop",
      "defusion.noFusionDrop",
      "expansion.intensityDrop",
      "expansion.noIntensityDrop",
    ];

    for (const locale of ["en", "bg"] as const) {
      const actKeys = new Set(
        STRINGS[locale].filter((entry) => entry.namespace === "act").map((entry) => entry.key),
      );
      // Positive control: the namespace really did load.
      expect(actKeys.size).toBeGreaterThan(0);

      for (const key of RETIRED_KEYS) {
        expect(actKeys.has(key)).toBe(false);
      }
    }
  });

  it("the recurring-thought insight states its count and recommends nothing (#1367)", () => {
    for (const locale of ["en", "bg"] as const) {
      const insight = STRINGS[locale].find(
        ({ namespace, key }) =>
          namespace === "cbt" && key === "dashboard.insights.recurringThoughtDetail",
      );

      expect(insight).toBeDefined();
      // The claim survives - it has a real floor behind it (>= 5 records and a
      // count of >= 2, in use-cbt-insights.ts).
      expect(insight?.text).toContain("{{count}}");
      // The advice clause does not. A computed pattern claim plus a
      // recommendation is the construction AGENTS.md requires explicit review
      // for; the product sits on the fact side.
      expect(insight?.text).not.toMatch(/consider whether|помисли дали/i);
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
