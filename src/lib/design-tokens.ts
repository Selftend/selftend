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

export const TINT_TEXT: Record<TintToken, string> = {
  primary: "text-primary",
  act: "text-[hsl(var(--act))]",
  be: "text-[hsl(var(--be))]",
  think: "text-[hsl(var(--think))]",
  aqua: "text-[hsl(var(--aqua))]",
  iris: "text-[hsl(var(--iris))]",
  ink: "text-[hsl(var(--ink))]",
  clay: "text-[hsl(var(--clay))]",
  mist: "text-[hsl(var(--mist))]",
};
