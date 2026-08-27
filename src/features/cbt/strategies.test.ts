import bgCbt from "@/src/i18n/locales/bg/cbt.json";
import enCbt from "@/src/i18n/locales/en/cbt.json";

import { PILLAR_STRATEGIES, type Pillar } from "./cbt-home/cbt-home-config";
import { isStrategyKey, strategyKeys } from "./strategies";

// The app carries two strategy vocabularies on purpose (docs/modules/cbt-doc-reconciliation.md):
// the pillar/home one in PILLAR_STRATEGIES, and the recovery one in strategyKeys. They overlap in
// ten keys and differ in exactly one each way. This file is the gate on that delta - a strategy
// added to one list without a deliberate decision about the other goes red here.
const PILLARS: Pillar[] = ["think", "act", "be"];

const pillarStrategies = PILLARS.flatMap((pillar) => PILLAR_STRATEGIES[pillar]);
const pillarStrategyKeys = pillarStrategies.map((strategy) => strategy.key);

// Both label maps are read with a dynamic key - `t(\`dashboard.strategies.${key}\`)` in recovery's
// notes card, timeline and export; `labelKey`/`descKey` in the pillars section - so
// test/i18n-key-coverage.test.ts, which only sees literal t("…") calls, is blind to all of them.
const enStrategyLabels: Record<string, string> = enCbt.dashboard.strategies;
const bgStrategyLabels: Record<string, string> = bgCbt.dashboard.strategies;

/** Resolve a dotted key path inside one locale's `cbt` bundle, the way `t()` would. */
function resolveKey(bundle: unknown, keyPath: string): unknown {
  return keyPath
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundle,
    );
}

// Words that may stay lowercase inside an English title. No current label contains one - the list
// is what stops the gate from mandating bad English ("Anxiety And Exposure") the day one does. The
// describe block below pins this behaviour directly, so the rule is specified rather than assumed.
const TITLE_CASE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

/**
 * The words of an English label that break Title Case, ignoring tokens with no letters ("&") and
 * splitting hyphens so "Self-Care" is read as two words. The first word is never allowed to be
 * lowercase, whatever it is.
 */
function titleCaseViolations(label: string): string[] {
  return label
    .split(/[\s-]+/)
    .filter((word) => /\p{L}/u.test(word))
    .filter((word, index) => {
      const firstLetter = /\p{L}/u.exec(word)?.[0] ?? "";
      if (firstLetter === firstLetter.toUpperCase()) return false;
      return index === 0 || !TITLE_CASE_SMALL_WORDS.has(word.toLowerCase());
    });
}

function expectResolvesInBothLocales(keyPath: string) {
  for (const [locale, bundle] of [
    ["en", enCbt],
    ["bg", bgCbt],
  ] as const) {
    const value = resolveKey(bundle, keyPath);
    expect({ locale, keyPath, type: typeof value }).toEqual({
      locale,
      keyPath,
      type: "string",
    });
    expect({ locale, keyPath, empty: (value as string).trim().length === 0 }).toEqual({
      locale,
      keyPath,
      empty: false,
    });
  }
}

describe("the two strategy vocabularies", () => {
  it("keeps mindfulness out of the pillar list and distortions out of the recovery list", () => {
    const recoveryOnly = strategyKeys.filter((key) => !pillarStrategyKeys.includes(key));
    const pillarOnly = pillarStrategyKeys.filter((key) => !isStrategyKey(key));

    // `mindfulness` is recovery-only: the relocation ruled by #1198 moved calming practice out of
    // CBT and into the shared tools, so it is not a pillar strategy - but a recovery plan still
    // asks about it, because mindfulness_sessions rows are a record source (active-strategies.ts).
    expect(recoveryOnly).toEqual(["mindfulness"]);

    // `distortions` is pillar-only: /modules/cbt/learn is a reference guide, not a practice, and a
    // recovery plan asks which practices you will keep using. It has no dashboard.strategies label
    // at all - the pillar card reads home.distortionGuide instead.
    expect(pillarOnly).toEqual(["distortions"]);
  });
});

describe("dashboard.strategies labels", () => {
  it.each(strategyKeys)("resolves %s in both locales", (key) => {
    expectResolvesInBothLocales(`dashboard.strategies.${key}`);
  });

  // #1507: `listMindfulnessSessions` reads `mindfulness_sessions` unfiltered, and that table is
  // what breathing, grounding AND meditation all write to - so one round of box breathing lights
  // this strategy up. The label therefore may not claim mindfulness specifically. The key id is
  // deliberately not renamed (it is persisted in recovery_plans.strategyIntegrationNotes), so this
  // guard is the only thing standing between the honest label and a revert to "Mindfulness".
  it.each([
    ["en", enStrategyLabels.mindfulness, /mindful/i],
    ["bg", bgStrategyLabels.mindfulness, /осъзнат/i],
  ])("does not label the %s calming strategy as mindfulness", (locale, label, overClaim) => {
    expect({ locale, label, overClaims: overClaim.test(label) }).toEqual({
      locale,
      label,
      overClaims: false,
    });
  });
});

describe("dashboard.strategies label casing", () => {
  // These labels are rendered as a set - the recovery notes card lists them together - so one
  // sentence-case entry reads as a typo next to "Goal Setting" and "Anger Management". Worth a gate
  // rather than a review catch: `dashboard.strategies` is dynamic-key territory that
  // test/i18n-key-coverage.test.ts cannot see, and casing is cheapest to hold before a string is
  // translated, because editing a source string is what sends translators back round to it.
  // English only - bg is sentence case throughout, which is correct for its orthography
  // ("Поставяне на цели"), so applying the same rule there would be wrong.
  // `title` is the section heading, not a strategy label, so it is not held to the label rule.
  it.each(Object.entries(enStrategyLabels).filter(([key]) => key !== "title"))(
    "writes the en %s label in Title Case",
    (key, label) => {
      expect({ key, label, lowercaseWords: titleCaseViolations(label) }).toEqual({
        key,
        label,
        lowercaseWords: [],
      });
    },
  );
});

describe("pillar label casing", () => {
  // The gate above reads `dashboard.strategies`, which is not the same set as the labels a pillar
  // card actually renders: `distortions` points its `labelKey` at `home.distortionGuide`, outside
  // that map entirely, so it sat uncovered while reading as sentence case next to "Thought Records"
  // and "Worry Time" in the same Think column. Iterating `labelKey` rather than the map keeps any
  // future out-of-map label covered the moment it is added. English only, for the same reason as
  // above - bg is sentence case throughout by its own orthography.
  it.each(pillarStrategies)("writes $key's en label in Title Case", (strategy) => {
    const label = resolveKey(enCbt, strategy.labelKey) as string;

    expect({ key: strategy.key, label, lowercaseWords: titleCaseViolations(label) }).toEqual({
      key: strategy.key,
      label,
      lowercaseWords: [],
    });
  });
});

// Without these, the gate above is only as good as the data it happens to run on: every committed
// label is already Title Case, so `titleCaseViolations` could `return []` unconditionally and all
// of them would stay green. These pin the rule itself, including the branches no label reaches yet.
describe("titleCaseViolations", () => {
  it.each([
    ["Calming practice", ["practice"]],
    ["calming practice", ["calming", "practice"]],
    ["Calming Practice", []],
    // The labels that already exist, including the two shapes with punctuation in them.
    ["Goal Setting", []],
    ["Self-Care", []],
    ["Anxiety & Exposure", []],
    // A hyphen is a word break, so the half after it is held to the rule too.
    ["Self-care", ["care"]],
    // Small words stay lowercase mid-title, but never in first position.
    ["Anxiety and Exposure", []],
    ["and Exposure", ["and"]],
  ])("reads %s as breaking Title Case at %s", (label, expected) => {
    expect({ label, lowercaseWords: titleCaseViolations(label) }).toEqual({
      label,
      lowercaseWords: expected,
    });
  });
});

describe("pillar strategy copy", () => {
  // Asserted against each entry's own `labelKey`/`descKey`, not against a path rebuilt from `key` -
  // `distortions` already proves the two can diverge (its label is `home.distortionGuide`).
  it.each(pillarStrategies)("resolves the label and description for $key", (strategy) => {
    expectResolvesInBothLocales(strategy.labelKey);
    expectResolvesInBothLocales(strategy.descKey);
  });

  // ...and the descriptions still have to follow the convention, so a newly added strategy cannot
  // quietly point `descKey` at some other namespace's string and pass the check above.
  it.each(pillarStrategies)(
    "keeps $key's description under pillars.strategyDescriptions",
    (strategy) => {
      expect(strategy.descKey).toBe(`pillars.strategyDescriptions.${strategy.key}`);
    },
  );
});
