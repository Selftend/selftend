import bgCbt from "@/src/i18n/locales/bg/cbt.json";
import enCbt from "@/src/i18n/locales/en/cbt.json";

import { PILLAR_STRATEGIES, type Pillar } from "./cbt-home/cbt-home-config";
import { strategyKeys } from "./strategies";

// The app carries two strategy vocabularies on purpose (docs/modules/cbt-doc-reconciliation.md):
// the pillar/home one in PILLAR_STRATEGIES, and the recovery one in strategyKeys. They overlap in
// ten keys and differ in exactly one each way. This file is the gate on that delta - a strategy
// added to one list without a deliberate decision about the other goes red here.
const PILLARS: Pillar[] = ["think", "act", "be"];

const pillarStrategyKeys = PILLARS.flatMap((pillar) =>
  PILLAR_STRATEGIES[pillar].map((strategy) => strategy.key),
);

// Both label maps are read with a dynamic key - `t(\`dashboard.strategies.${key}\`)` in
// recovery's notes card, timeline and export; `descKey` in the pillars section - so
// test/i18n-key-coverage.test.ts, which only sees literal t("…") calls, is blind to all of them.
const enStrategyLabels: Record<string, string> = enCbt.dashboard.strategies;
const bgStrategyLabels: Record<string, string> = bgCbt.dashboard.strategies;
const enStrategyDescriptions: Record<string, string> = enCbt.pillars.strategyDescriptions;
const bgStrategyDescriptions: Record<string, string> = bgCbt.pillars.strategyDescriptions;

function expectNonEmptyString(value: string | undefined) {
  expect(typeof value).toBe("string");
  expect(value?.trim().length ?? 0).toBeGreaterThan(0);
}

describe("the two strategy vocabularies", () => {
  it("keeps mindfulness out of the pillar list and distortions out of the recovery list", () => {
    const recoveryOnly = strategyKeys.filter((key) => !pillarStrategyKeys.includes(key));
    const pillarOnly = pillarStrategyKeys.filter(
      (key) => !(strategyKeys as readonly string[]).includes(key),
    );

    // `mindfulness` is recovery-only: the relocation ruled by #1198 moved calming practice out of
    // CBT and into the shared tools, so it is not a pillar strategy - but a recovery plan still
    // asks about it, because mindfulness_sessions rows are a record source (active-strategies.ts).
    expect(recoveryOnly).toEqual(["mindfulness"]);

    // `distortions` is pillar-only: /modules/cbt/learn is a reference guide, not a practice, and a
    // recovery plan asks which practices you will keep using. It has no dashboard.strategies label
    // at all - the pillar card reads home.distortionGuide instead.
    expect(pillarOnly).toEqual(["distortions"]);
  });

  it("overlaps in the other ten keys", () => {
    const shared = strategyKeys.filter((key) => pillarStrategyKeys.includes(key));
    expect(shared).toHaveLength(10);
  });
});

describe("dashboard.strategies labels", () => {
  it.each(strategyKeys)("resolves %s in both locales", (key) => {
    expectNonEmptyString(enStrategyLabels[key]);
    expectNonEmptyString(bgStrategyLabels[key]);
  });
});

describe("pillars.strategyDescriptions entries", () => {
  it.each(pillarStrategyKeys)("resolves %s in both locales", (key) => {
    expectNonEmptyString(enStrategyDescriptions[key]);
    expectNonEmptyString(bgStrategyDescriptions[key]);
  });
});
