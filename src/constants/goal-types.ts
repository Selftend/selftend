export const goalTypes = ["doMore", "doLess", "improveRelationship", "improveQuality"] as const;

export type GoalType = (typeof goalTypes)[number];
