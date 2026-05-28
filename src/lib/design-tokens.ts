// src/lib/design-tokens.ts
export const TINT_TOKENS = [
  "primary",
  "act",
  "be",
  "think",
  "aqua",
  "iris",
  "ink",
  "clay",
  "mist",
] as const;

export type TintToken = (typeof TINT_TOKENS)[number];
