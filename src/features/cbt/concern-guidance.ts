export const concernStrategyMap = {
  anxiety: ["worry", "exposure", "mindfulness"],
  anger: ["anger", "selfCare", "mindfulness"],
  depression: ["activities", "thoughts", "selfCare"],
  panic: ["exposure", "mindfulness", "thoughts"],
  procrastination: ["tasks", "goals", "thoughts"],
  socialAnxiety: ["exposure", "thoughts", "beliefs"],
} as const;

export type ConcernKey = keyof typeof concernStrategyMap;
export type GuidedStrategyKey = (typeof concernStrategyMap)[ConcernKey][number];

export function getConcernGuidance(selectedConcerns: string[]) {
  const seen = new Set<GuidedStrategyKey>();
  const strategyKeys: GuidedStrategyKey[] = [];

  for (const concern of selectedConcerns) {
    const mapped = concernStrategyMap[concern as ConcernKey];
    if (!mapped) continue;

    for (const strategyKey of mapped) {
      if (seen.has(strategyKey)) continue;
      seen.add(strategyKey);
      strategyKeys.push(strategyKey);
    }
  }

  return strategyKeys;
}
