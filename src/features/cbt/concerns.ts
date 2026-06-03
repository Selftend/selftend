import { distortionDefinitions } from "@/src/constants/distortions";
import { strategyKeys, type StrategyKey } from "@/src/features/cbt/strategies";

export type CbtConcern =
  | "depression"
  | "gad"
  | "panic"
  | "socialAnxiety"
  | "anger"
  | "procrastination";

export const CBT_CONCERNS: CbtConcern[] = [
  "depression",
  "gad",
  "panic",
  "socialAnxiety",
  "anger",
  "procrastination",
];

export const CONCERN_RECOMMENDED_STRATEGIES: Record<CbtConcern, StrategyKey[]> = {
  depression: ["thoughts", "activities", "beliefs"],
  gad: ["worry", "exposure"],
  panic: ["thoughts", "exposure"],
  socialAnxiety: ["thoughts", "exposure"],
  anger: ["anger", "thoughts"],
  procrastination: ["tasks", "thoughts"],
};

export const CONCERN_DISTORTIONS: Record<CbtConcern, string[]> = {
  depression: ["all-or-nothing", "discounting-the-positive", "overgeneralization"],
  gad: ["catastrophizing", "fortune-telling", "emotional-reasoning"],
  panic: ["catastrophizing", "emotional-reasoning"],
  socialAnxiety: ["mind-reading", "discounting-the-positive", "personalization"],
  anger: ["should-statements", "mind-reading", "personalization"],
  procrastination: ["fortune-telling", "should-statements"],
};

export const CONCERN_BELIEF_EXAMPLE_KEYS: Record<CbtConcern, string[]> = {
  depression: [
    "concerns.depression.belief1",
    "concerns.depression.belief2",
    "concerns.depression.belief3",
  ],
  gad: ["concerns.gad.belief1", "concerns.gad.belief2"],
  panic: ["concerns.panic.belief1", "concerns.panic.belief2"],
  socialAnxiety: ["concerns.socialAnxiety.belief1", "concerns.socialAnxiety.belief2"],
  anger: ["concerns.anger.belief1", "concerns.anger.belief2"],
  procrastination: [
    "concerns.procrastination.belief1",
    "concerns.procrastination.belief2",
    "concerns.procrastination.belief3",
  ],
};

const CONCERN_SET = new Set<string>(CBT_CONCERNS);

export function isCbtConcern(value: string): value is CbtConcern {
  return CONCERN_SET.has(value);
}

export function recommendedStrategiesFor(concerns: CbtConcern[]): StrategyKey[] {
  const wanted = new Set<StrategyKey>();
  for (const concern of concerns) {
    for (const key of CONCERN_RECOMMENDED_STRATEGIES[concern]) wanted.add(key);
  }
  return strategyKeys.filter((key) => wanted.has(key));
}

export function distortionsForConcerns(concerns: CbtConcern[]): string[] {
  const valid = new Set(distortionDefinitions.map((d) => d.key));
  const out: string[] = [];
  for (const concern of concerns) {
    for (const key of CONCERN_DISTORTIONS[concern]) {
      if (valid.has(key) && !out.includes(key)) out.push(key);
    }
  }
  return out;
}
