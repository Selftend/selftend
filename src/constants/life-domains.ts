export const lifeDomains = [
  "work",
  "relationships",
  "health",
  "leisure",
  "personalGrowth",
  "other",
] as const;

export type LifeDomain = (typeof lifeDomains)[number];
