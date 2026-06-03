export const strategyKeys = [
  "goals",
  "activities",
  "thoughts",
  "values",
  "beliefs",
  "exposure",
  "worry",
  "mindfulness",
  "tasks",
  "anger",
  "selfCare",
] as const;

export type StrategyKey = (typeof strategyKeys)[number];

export function isStrategyKey(key: string): key is StrategyKey {
  return (strategyKeys as readonly string[]).includes(key);
}
