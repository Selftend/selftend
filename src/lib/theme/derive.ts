// Derivation: 6 core hexes per scheme → the full 20-name contract (#559).
//
// The default way to author a style is to supply `bg, surface, border, ink,
// muted, accent` and let the other fourteen fall out of these rules, which are
// WikiCanvas's, already shipping there across seven palettes. Hand-authoring a
// full token block stays first-class (see styles.ts) — `quiet-lilac` takes that
// escape because it is the shipping app and must stay pixel-identical, a
// guarantee no derivation can make.
//
// Consequence, stated plainly: derivation collapses `--secondary`, `--muted`
// and `--accent` onto one alt-surface value. `quiet-lilac` gives all three
// distinct values and, being hand-authored, keeps them. The contract fixes the
// names, not a requirement that they differ. If a derived style later looks flat
// because of that collapse, the fix is to extend the formula or hand-author that
// style — not to change lilac.

import { hexToHslTriple, mixHex, withLightness } from "./color";
import type { ColorScheme, ThemeTokens } from "./contract";

/** The six hexes a derived style authors, per scheme. */
export interface CoreHexes {
  /** Page background. */
  bg: string;
  /** Cards and popovers — the surface that sits on the page. */
  surface: string;
  /** Hairlines and control outlines. */
  border: string;
  /** Body text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** The style's accent — buttons, links, the brand colour. */
  accent: string;
}

/**
 * One destructive pair for every style: red reads as "danger" on all eight
 * palettes, and a per-style destructive would be eight more contrast pairs to
 * gate for no legibility gain. These are today's `quiet-lilac` values, so the
 * default style's authored block and every derived style agree on them.
 */
export const DESTRUCTIVE: Record<ColorScheme, { color: string; foreground: string }> = {
  light: { color: "0 72% 48%", foreground: "0 0% 100%" },
  dark: { color: "0 68% 64%", foreground: "0 0% 100%" },
};

/**
 * The lightness a derived style's accent becomes legible small-text ink at —
 * the recipe documented at length on PRIMARY_INK_LIGHTNESS in
 * src/lib/design-tokens.ts (28% light, 80% dark), applied here to whatever
 * accent the style authored.
 *
 * The recipe is palette-agnostic in *form*, so it applies to all eight styles
 * unchanged. Its *sufficiency* is not: 28 and 80 are numbers measured against
 * violet, and nothing guarantees they clear AA for a gold or a blue. #560 turns
 * that into a computed gate and replaces this constant with a solver for the
 * smallest move off the accent that clears the floor. Until then a derived style
 * that fails is fixed by hand-authoring *that style's* ink — never by moving
 * this constant, which would silently re-tint every style that was fine.
 * theme-contract.test.ts pins these two numbers to the design-tokens recipe so
 * the two copies cannot drift while both exist.
 */
export const DERIVED_INK_LIGHTNESS: Record<ColorScheme, number> = { light: 28, dark: 80 };

/**
 * Fill the contract from a style's six core hexes.
 *
 * - `altSurface = mix(bg, border, .5)` — one step off the page, for secondary,
 *   muted and accent surfaces.
 * - `input = mix(border, ink, .15)` — a control outline reads a shade firmer
 *   than a hairline.
 * - `ring = mix(accent, bg | ink, .4)` — the focus ring is the accent softened
 *   toward the page in light (a tint) and toward the ink in dark (a lift), so it
 *   stays visible against the surface it is drawn on either way.
 * - `primary-foreground = surface | bg` — what a label on a filled accent button
 *   is painted in. Picked by scheme here; #560 picks it by measurement.
 */
export function deriveTokens(core: CoreHexes, scheme: ColorScheme): ThemeTokens {
  const altSurface = mixHex(core.bg, core.border, 0.5);
  const input = mixHex(core.border, core.ink, 0.15);
  const ring = mixHex(core.accent, scheme === "light" ? core.bg : core.ink, 0.4);
  const primaryForeground = scheme === "light" ? core.surface : core.bg;
  const accentTriple = hexToHslTriple(core.accent);

  return {
    "--background": hexToHslTriple(core.bg),
    "--foreground": hexToHslTriple(core.ink),
    "--card": hexToHslTriple(core.surface),
    "--card-foreground": hexToHslTriple(core.ink),
    "--popover": hexToHslTriple(core.surface),
    "--popover-foreground": hexToHslTriple(core.ink),
    "--primary": accentTriple,
    "--primary-foreground": hexToHslTriple(primaryForeground),
    "--primary-ink": withLightness(accentTriple, DERIVED_INK_LIGHTNESS[scheme]),
    "--secondary": hexToHslTriple(altSurface),
    "--secondary-foreground": hexToHslTriple(core.ink),
    "--muted": hexToHslTriple(altSurface),
    "--muted-foreground": hexToHslTriple(core.muted),
    "--accent": hexToHslTriple(altSurface),
    "--accent-foreground": hexToHslTriple(core.ink),
    "--destructive": DESTRUCTIVE[scheme].color,
    "--destructive-foreground": DESTRUCTIVE[scheme].foreground,
    "--border": hexToHslTriple(core.border),
    "--input": hexToHslTriple(input),
    "--ring": hexToHslTriple(ring),
  };
}
