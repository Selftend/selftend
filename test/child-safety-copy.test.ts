import { LOCALE_STRINGS } from "@/test/locale-strings";

/**
 * The merge-gate half of the child-safety content review (#1770, spec #227 §4).
 *
 * `docs/child-safety-review.md` is the record of that review - every module,
 * every checklist row, and the reasoning for each accepted item. This file is
 * the part of it a machine can hold, and it exists for the reason every copy
 * guard in this repo exists: a content decision that lives only in a document
 * is a decision the next person with a good sentence reverses without knowing.
 *
 * ☠️ **KEYED ON THE CLAIM, NEVER ON THE SUBJECT MATTER.** Selftend is a mental
 * health app. It has to be able to say "anxiety", "depression", "panic",
 * "crisis" and "not a cure" - the crisis page's whole job is to say some of
 * them plainly. A rule keyed on the vocabulary would go red on the copy that
 * protects people, which is the over-sweep failure that gets a guard deleted
 * rather than fixed (`positioning-copy` § the AI block, #1606 §9). So every
 * rule below bans a *claim shape* a well-meaning writer reaches for, and the
 * probes at the bottom pin the legitimate neighbours that must stay legal.
 *
 * ⚠️ Same one-sided design as `positioning-copy` and `restraint-copy`: every
 * rule is a ban. There is no assertion that a module *says* anything, because
 * that pins a string and fails on any honest rewrite.
 *
 * The reading-level half of §4's checklist is deliberately NOT here. Sentence
 * length is a signal, not a rule - `policies.json` is legally dense on purpose
 * and is mitigated by the plain-language summary at the top of the privacy
 * policy rather than by shortening the clauses. A word-count gate over
 * translated legal text would fail on correct copy every time it was touched.
 * That half is recorded per module in the document instead.
 */

type Locale = "en" | "bg";

interface Rule {
  name: string;
  pattern: RegExp;
  locale: Locale;
  /**
   * Narrows a rule to one namespace, optionally to keys beneath one prefix.
   * Omitted means every string in the locale, which is the right default for a
   * claim shape and the wrong one for a word - see the TREATMENT_FRAMING block.
   */
  scope?: { namespace: string; keyPrefix?: string };
  /**
   * A string this rule MUST match. ☠️ Not decoration - the Bulgarian rules are
   * written against these first, because JS `\b` is ASCII-only and silently
   * matches nothing in Cyrillic. A bg rule with no probe is a rule nobody has
   * evidence works.
   *
   * ☠️ **`\w` IS ASCII-ONLY TOO, AND IT BIT THIS FILE DURING REVIEW.** Widening
   * a bg rule from `преобучение` to a stem plus `\w*` looked like the obvious
   * generalisation and matched NOTHING - `\w` is `[A-Za-z0-9_]`, so it cannot
   * follow a Cyrillic stem. The bg rules use explicit `[а-яё]*` for that reason.
   * This probe test is what caught it; without it the rule would have gone green
   * and guarded nothing.
   */
  probe: string;
}

/**
 * §4: "no copy implying medical outcomes."
 *
 * The three shapes the review actually found, generalised one step. "Writing
 * heals" was the journal's onboarding title; "retrain the brain for lasting
 * emotional well-being" and "Your Way to Better Mental Health" were the CBT
 * intro's subtitle and title. All three promise a health outcome the product
 * cannot deliver and, per AGENTS.md § Privacy and safety expectations, must not
 * imply.
 */
const MEDICAL_OUTCOME: Rule[] = [
  {
    name: "en: <activity> heals",
    pattern: /\b(?:writing|journal(?:ing|ling)?|meditation|breathing|gratitude|CBT)\s+heals\b/i,
    locale: "en",
    probe: "Writing heals",
  },
  {
    name: "en: retrain/rewire the brain",
    pattern: /\b(?:retrain|rewire|reprogram\w*)\w*\s+(?:the|your)\s+brain\b/i,
    locale: "en",
    probe:
      "the essential self-care habits required to retrain the brain for lasting emotional well-being.",
  },
  {
    name: "en: your way to better mental health",
    pattern: /\bway to better mental health\b/i,
    locale: "en",
    probe: "Think, Act, and Be Your Way to Better Mental Health",
  },
  // ⚠️ This rule has never had a live violation, and that is the point rather
  // than an argument against it. `positioning-copy` records the same finding
  // from #1606: the rules seeded with zero live violations "turn out to be the
  // highest-consequence ones on the map - the claims a person writing marketing
  // copy in good faith reaches for first". "Clinically proven" is the single
  // most reachable false claim a wellness app can make. Do not delete it for
  // being green.
  {
    name: "en: clinically proven / proven to",
    pattern: /\b(?:clinically proven|proven to (?:reduce|treat|cure|fix|help))\b/i,
    locale: "en",
    probe: "A clinically proven approach to anxiety.",
  },
  // The breathing module promised a measurable physiological result:
  // "Maximises heart rate variability and reduces anxiety over time." Keyed on
  // the ABSOLUTE VERB rather than on physiology, because describing what an
  // exercise does to the body is legitimate and common - "settles the nervous
  // system" stays legal on purpose, and is pinned below. What a self-help app
  // cannot do is promise to maximise, eliminate or guarantee an outcome.
  {
    name: "en: absolute effect verb on a health outcome",
    pattern:
      /\b(?:maximis|maximiz|eliminat|guarantee|ensur)\w*\s+(?:your\s+)?(?:heart rate variability|anxiety|stress|depression|low mood|insomnia)\b/i,
    locale: "en",
    probe: "Maximises heart rate variability and reduces anxiety over time.",
  },
  {
    name: "bg: absolute effect verb on a health outcome",
    pattern:
      /(?:максимизира|елиминира|гарантира)\s+(?:вариабилността|тревожността|стреса|безсънието)/i,
    locale: "bg",
    probe: "Максимизира вариабилността на сърдечния ритъм и намалява тревожността с времето.",
  },
  {
    name: "bg: клинично доказан",
    pattern: /клинично\s+доказан[а-яё]*/i,
    locale: "bg",
    probe: "Клинично доказан подход към тревожността.",
  },
  {
    name: "bg: <activity> лекува",
    pattern: /(?:писането|дневникът|медитацията|дишането|благодарността|КПТ)\s+лекува/i,
    locale: "bg",
    probe: "Писането лекува",
  },
  {
    name: "bg: преобучение/пренастройване на мозъка",
    pattern: /(?:преобуч|пренастрой|препрограмир)[а-яё]*\s+(?:на\s+)?мозъка/i,
    locale: "bg",
    probe:
      "навици за самогрижа, необходими за преобучение на мозъка за трайно емоционално благополучие.",
  },
  {
    name: "bg: пътят към по-добро психично здраве",
    pattern: /пътя(?:т)?\s+към\s+по-добро\s+психично\s+здраве/i,
    locale: "bg",
    probe: "по пътя към по-добро психично здраве",
  },
];

/**
 * §4: "exposure and recovery content framed as self-help rather than treatment."
 *
 * The exposure tool shipped the vocabulary of a therapist-run protocol -
 * "hierarchy" as the UI noun and a bare "SUDS" on four field labels - while the
 * help content and the CBT programme task beside it both already said
 * **ladder**, in English and in Bulgarian. So this is not a preference between
 * two words: two surfaces out of three already used the plain one, and the
 * review unified on it.
 *
 * ⚠️ **IDENTIFIERS ARE NOT COPY.** `exposure_hierarchies` is a table name, the
 * Zod schemas and the `/modules/cbt/exposure/[id]` route keep their spelling,
 * and `docs/positioning.md` § Words to use draws exactly this line for exactly
 * this reason. These rules read translated values only - `LOCALE_STRINGS` never
 * sees a key or a column.
 *
 * ☠️ **THE TWO "hierarchy" RULES ARE SCOPED, AND THE FIRST DRAFT WAS NOT.** They
 * shipped for review as a bare `/\bhierarch(y|ies)\b/i` over all 20 namespaces -
 * which is keyed on VOCABULARY, the one thing the header of this file forbids,
 * in the file that forbids it. "Hierarchy" is an ordinary English word: an
 * accessibility string describing a heading hierarchy would have failed on
 * sight, and a guard that goes red on obviously-correct copy is a guard someone
 * deletes rather than fixes. The finding was never about the word, it was about
 * the exposure tool calling its own object by a clinician's noun - so the scope
 * is the finding. `SUDS` needs no scope: it is a clinical instrument acronym
 * with no ordinary-English use anywhere.
 */
const TREATMENT_FRAMING: Rule[] = [
  {
    name: "en: exposure hierarchy (UI noun)",
    pattern: /\bhierarch(?:y|ies)\b/i,
    locale: "en",
    scope: { namespace: "cbt", keyPrefix: "exposure." },
    probe: "Build an exposure hierarchy",
  },
  {
    name: "en: bare SUDS on a label",
    pattern: /\bSUDS\b/,
    locale: "en",
    probe: "Anticipated SUDS (0-100)",
  },
  {
    name: "bg: йерархия (UI noun)",
    pattern: /йерархи/i,
    locale: "bg",
    scope: { namespace: "cbt", keyPrefix: "exposure." },
    probe: "Изгради йерархия за излагане",
  },
  {
    name: "bg: bare SUDS on a label",
    pattern: /\bSUDS\b/,
    locale: "bg",
    probe: "Очаквана SUDS (0-100)",
  },
];

const ALL_RULES = [...MEDICAL_OUTCOME, ...TREATMENT_FRAMING];

function inScope(rule: Rule, namespace: string, key: string): boolean {
  if (!rule.scope) return true;
  if (rule.scope.namespace !== namespace) return false;
  return rule.scope.keyPrefix ? key.startsWith(rule.scope.keyPrefix) : true;
}

function matching(rule: Rule) {
  return LOCALE_STRINGS[rule.locale]
    .filter(({ namespace, key }) => inScope(rule, namespace, key))
    .filter(({ text }) => rule.pattern.test(text))
    .map(({ namespace, key, text }) => `${namespace}:${key} — ${text}`);
}

describe("child-safety copy rules (#1770)", () => {
  it.each(ALL_RULES.map((rule) => [rule.name, rule] as const))(
    "no shipped string matches %s",
    (_name, rule) => {
      expect(matching(rule)).toEqual([]);
    },
  );

  // ☠️ Without this every rule above could be a typo that matches nothing, and
  // the suite would be a row of green ticks over unguarded copy. It is the same
  // guard `positioning-copy` carries, and it is load-bearing for the Cyrillic
  // rules in particular.
  it.each(ALL_RULES.map((rule) => [rule.name, rule] as const))(
    "%s actually matches its own probe",
    (_name, rule) => {
      expect(rule.pattern.test(rule.probe)).toBe(true);
    },
  );
});

describe("child-safety copy rules - the neighbours that must stay legal", () => {
  // The crisis page's job is to say these plainly. If a future "simplification"
  // keys any rule above on subject matter instead of claim shape, this test
  // names what that broke rather than leaving it to look like bad copy.
  const MUST_STAY_LEGAL = [
    "Grounding is not a cure - it's a circuit breaker.",
    "If you might hurt yourself or someone else, or if anyone is in immediate danger, contact local emergency services now.",
    "No. Selftend cannot help in an emergency. If you are in crisis or at risk of harm, contact local emergency services or a crisis line.",
    "The Think · Act · Be framework. Strategies for anxiety, depression, anger, panic and worry.",
    "Build a ladder of situations by difficulty, start low, and repeat each step until the anxiety eases.",
    "Slowing the breath settles the nervous system and lowers physical arousal.",
    "Equal counts of inhale, hold, exhale, hold - used to quickly reduce acute stress.",
    "Заземяването не е лечение - то е прекъсвач.",
    "Ако може да нараниш себе си или някой друг, или ако някой е в непосредствена опасност, свържи се с местните спешни служби сега.",
  ];

  it.each(MUST_STAY_LEGAL)("stays legal: %s", (text) => {
    const tripped = ALL_RULES.filter((rule) => rule.pattern.test(text)).map((r) => r.name);
    expect(tripped).toEqual([]);
  });
});
