// The style table: every named palette, resolved to the 20-name contract for
// both schemes (#579).
//
// A style is authored one of two ways, and both are first-class:
//
//   { kind: "derived",  light: <6 hexes>, dark: <6 hexes> }
//   { kind: "authored", light: <20 tokens>, dark: <20 tokens> }
//
// Derived is the default — six hexes per scheme and the rules in derive.ts fill
// the rest. `quiet-lilac` takes the authored escape, and the reason is not
// stylistic: it is the palette the app ships today, and #579 requires it to
// render pixel-identical. Derivation rounds through integer H/S%/L% and collapses
// secondary/muted/accent onto one alt-surface, so no set of six hexes reproduces
// lilac's twenty values exactly. WikiCanvas hit the same wall with Atlas and
// built this escape hatch for it.
//
// The remaining seven palettes (#581) arrive as `derived` entries; #560's gate
// decides which of them, if any, also needs an authored ink.

import type { ColorScheme, ThemeTokens } from "./contract";
import { deriveTokens, type CoreHexes } from "./derive";

export const STYLE_NAMES = [
  "quiet-lilac",
  "ink-ivory",
  "atlas",
  "deep-field",
  "sage-garden",
  "plum-manuscript",
  "amber-noir",
  "glacier",
] as const;

export type StyleName = (typeof STYLE_NAMES)[number];

/** Today's palette. New installs and every unmigrated device land here. */
export const DEFAULT_STYLE: StyleName = "quiet-lilac";

export type StyleSource =
  | { kind: "derived"; light: CoreHexes; dark: CoreHexes }
  | { kind: "authored"; light: ThemeTokens; dark: ThemeTokens };

// `quiet-lilac`, verbatim from the global.css that shipped v0.10.0. Do not
// "tidy" a value here: test/theme-contract.test.ts pins this block to the CSS
// fallback pair, and every number in it carries a measured contrast floor
// (test/theme-token-sync.test.ts). --primary-ink in particular is not free —
// light 28% and dark 80% are the binding numbers from #421, dark being the one
// ink in the app that is *lighter* than its accent.
const QUIET_LILAC: StyleSource = {
  kind: "authored",
  light: {
    "--background": "260 28% 96%",
    "--foreground": "260 18% 14%",
    "--card": "260 28% 99%",
    "--card-foreground": "258 22% 15%",
    "--popover": "260 28% 99%",
    "--popover-foreground": "258 22% 15%",
    "--primary": "262 62% 56%",
    "--primary-foreground": "0 0% 100%",
    "--primary-ink": "262 62% 28%",
    "--secondary": "260 8% 92%",
    "--secondary-foreground": "260 12% 24%",
    "--muted": "260 14% 95%",
    "--muted-foreground": "260 8% 42%",
    "--accent": "260 28% 93%",
    "--accent-foreground": "260 28% 25%",
    "--destructive": "0 72% 48%",
    "--destructive-foreground": "0 0% 100%",
    "--border": "260 14% 87%",
    "--input": "260 14% 87%",
    "--ring": "262 62% 64%",
  },
  dark: {
    "--background": "260 20% 9%",
    "--foreground": "260 30% 96%",
    "--card": "260 16% 16%",
    "--card-foreground": "260 30% 96%",
    "--popover": "260 18% 13%",
    "--popover-foreground": "260 30% 96%",
    "--primary": "264 72% 72%",
    "--primary-foreground": "260 22% 12%",
    "--primary-ink": "264 72% 80%",
    "--secondary": "260 8% 22%",
    "--secondary-foreground": "260 24% 92%",
    "--muted": "260 12% 18%",
    "--muted-foreground": "260 12% 72%",
    "--accent": "260 20% 24%",
    "--accent-foreground": "260 32% 93%",
    "--destructive": "0 68% 64%",
    "--destructive-foreground": "0 0% 100%",
    "--border": "260 12% 24%",
    "--input": "260 12% 22%",
    "--ring": "264 72% 72%",
  },
};

// The seven derived palettes, six core hexes per scheme. Every other token —
// including both colours the contrast solver owns — falls out of derive.ts, so
// authoring a palette is choosing six colours and nothing else. Adding one that
// cannot clear the floors fails the build (test/theme-contrast.test.ts); the
// solver throws before a token table is even produced.
//
// Radius, fonts, spacing and control shapes are absent by construction, not by
// discipline: the contract has no name for them. WikiCanvas ships a per-style
// radius and serif alongside these same hexes and we deliberately do not — the
// style axis is colours only (#555 §2).
const DERIVED_STYLES: Record<Exclude<StyleName, "quiet-lilac">, StyleSource> = {
  "ink-ivory": {
    kind: "derived",
    light: {
      bg: "#fafafa",
      surface: "#ffffff",
      border: "#d9dade",
      ink: "#17181a",
      muted: "#5f6368",
      accent: "#2f56d9",
    },
    dark: {
      bg: "#131417",
      surface: "#1b1c20",
      border: "#2c2e33",
      ink: "#e8e9eb",
      muted: "#9aa0a6",
      accent: "#8fa6f5",
    },
  },
  // Atlas's core hexes are recovered from its hand-authored token block rather
  // than from a brief: it is a pre-existing palette that was never written as
  // six colours. Selftend derives it, because only `quiet-lilac` carries a
  // pixel-identical promise.
  atlas: {
    kind: "derived",
    light: {
      bg: "#f7f4ee",
      surface: "#fffefa",
      border: "#e3ddce",
      ink: "#221e16",
      muted: "#6f6858",
      accent: "#a6553a",
    },
    dark: {
      bg: "#1f1b14",
      surface: "#2b261d",
      border: "#5b5443",
      ink: "#f0eadb",
      muted: "#b0a792",
      accent: "#d08a6c",
    },
  },
  // The teal that broke the old fixed ink recipe: its accent already sits at
  // L≈27%, so "fix L to 28%" lightened it, to 4.13 / 3.81 / 3.17.
  "deep-field": {
    kind: "derived",
    light: {
      bg: "#eef1f6",
      surface: "#ffffff",
      border: "#dde3ee",
      ink: "#131722",
      muted: "#5c6784",
      accent: "#0c7d76",
    },
    dark: {
      bg: "#0d1220",
      surface: "#141b30",
      border: "#2a3350",
      ink: "#dfe4f2",
      muted: "#8e99b8",
      accent: "#5ad0c8",
    },
  },
  "sage-garden": {
    kind: "derived",
    light: {
      bg: "#f2f5f0",
      surface: "#ffffff",
      border: "#dde3d8",
      ink: "#1e241e",
      muted: "#66705f",
      accent: "#3e7d54",
    },
    dark: {
      bg: "#1f261f",
      surface: "#2a332a",
      border: "#3a443a",
      ink: "#e2e8dd",
      muted: "#a3ad9c",
      accent: "#7fb98f",
    },
  },
  "plum-manuscript": {
    kind: "derived",
    light: {
      bg: "#f7f4fa",
      surface: "#ffffff",
      border: "#e4dcee",
      ink: "#251d31",
      muted: "#6f6484",
      accent: "#6d3fc4",
    },
    dark: {
      bg: "#221a2e",
      surface: "#2c2439",
      border: "#3e3450",
      ink: "#e6dff0",
      muted: "#a394bd",
      accent: "#a98ae8",
    },
  },
  // The gold whose accent cannot carry a white label (4.43) — the palette that
  // made `primary-foreground` a measurement rather than a scheme lookup.
  "amber-noir": {
    kind: "derived",
    light: {
      bg: "#f7f4ec",
      surface: "#ffffff",
      border: "#e4ddcf",
      ink: "#1c1a17",
      muted: "#6f685c",
      accent: "#a06e14",
    },
    dark: {
      bg: "#121110",
      surface: "#1c1a17",
      border: "#35302a",
      ink: "#ece5d8",
      muted: "#9a9182",
      accent: "#e2a63d",
    },
  },
  glacier: {
    kind: "derived",
    light: {
      bg: "#f2f6f9",
      surface: "#ffffff",
      border: "#dbe4ec",
      ink: "#182633",
      muted: "#5b6b7a",
      accent: "#0f6fa3",
    },
    dark: {
      bg: "#101b24",
      surface: "#182633",
      border: "#2a3a48",
      ink: "#dfe8ef",
      muted: "#8fa3b3",
      accent: "#5fb0dd",
    },
  },
};

export const STYLE_SOURCES: Record<StyleName, StyleSource> = {
  "quiet-lilac": QUIET_LILAC,
  ...DERIVED_STYLES,
};

/**
 * Human-facing names for the selector (#583). Proper nouns for the palettes
 * themselves, so they are NOT translated — only the chrome around them
 * (headings, the appearance labels, the Default marker) goes through i18n.
 */
export const STYLE_LABELS: Record<StyleName, string> = {
  "quiet-lilac": "Quiet Lilac",
  "ink-ivory": "Ink & Ivory",
  atlas: "Atlas",
  "deep-field": "Deep Field",
  "sage-garden": "Sage Garden",
  "plum-manuscript": "Plum Manuscript",
  "amber-noir": "Amber Noir",
  glacier: "Glacier",
};

export function resolveStyle(source: StyleSource): Record<ColorScheme, ThemeTokens> {
  if (source.kind === "authored") return { light: source.light, dark: source.dark };
  return {
    light: deriveTokens(source.light, "light"),
    dark: deriveTokens(source.dark, "dark"),
  };
}

/** The full token table: every style × both schemes, resolved once at load. */
export const THEME_TOKENS = Object.fromEntries(
  STYLE_NAMES.map((name) => [name, resolveStyle(STYLE_SOURCES[name])]),
) as Record<StyleName, Record<ColorScheme, ThemeTokens>>;
