import type { Href } from "expo-router";

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

// Route + i18n label for strategies the recommendation engine can suggest. labelKeys
// reuse the existing cbt:dashboard.strategies.* copy already used by the home pillars.
export const STRATEGY_LINKS: Partial<Record<StrategyKey, { labelKey: string; route: Href }>> = {
  thoughts: { labelKey: "dashboard.strategies.thoughts", route: "/modules/cbt/new" },
  beliefs: { labelKey: "dashboard.strategies.beliefs", route: "/modules/cbt/beliefs" },
  worry: { labelKey: "dashboard.strategies.worry", route: "/modules/cbt/worry" },
  activities: { labelKey: "dashboard.strategies.activities", route: "/modules/cbt/activities" },
  exposure: { labelKey: "dashboard.strategies.exposure", route: "/modules/cbt/exposure" },
  anger: { labelKey: "dashboard.strategies.anger", route: "/modules/cbt/anger" },
  tasks: { labelKey: "dashboard.strategies.tasks", route: "/modules/cbt/tasks" },
};
