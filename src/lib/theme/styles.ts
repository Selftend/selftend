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

export const STYLE_NAMES = ["quiet-lilac"] as const;

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

export const STYLE_SOURCES: Record<StyleName, StyleSource> = {
  "quiet-lilac": QUIET_LILAC,
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
