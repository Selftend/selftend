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

import { hexToHslTriple, mixHex } from "./color";
import type { ColorScheme, ThemeTokens } from "./contract";
import { pickPrimaryForeground, solveDestructive, solveInk } from "./contrast";

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
 * Fill the contract from a style's six core hexes.
 *
 * - `altSurface = mix(bg, border, .5)` — one step off the page, for secondary,
 *   muted and accent surfaces.
 * - `input = mix(border, ink, .15)` — a control outline reads a shade firmer
 *   than a hairline.
 * - `ring = mix(accent, bg | ink, .4)` — the focus ring is the accent softened
 *   toward the page in light (a tint) and toward the ink in dark (a lift), so it
 *   stays visible against the surface it is drawn on either way.
 *
 * The two colours that are NOT a formula are `--primary-ink` and
 * `--primary-foreground`: both are measured, in contrast.ts. A fixed recipe for
 * either fails on some palette in the set, and which palette it fails on cannot
 * be predicted from the hexes — that is the whole finding of #560.
 */
export function deriveTokens(core: CoreHexes, scheme: ColorScheme): ThemeTokens {
  const altSurface = mixHex(core.bg, core.border, 0.5);
  const input = mixHex(core.border, core.ink, 0.15);
  const ring = mixHex(core.accent, scheme === "light" ? core.bg : core.ink, 0.4);
  const accentTriple = hexToHslTriple(core.accent);
  const background = hexToHslTriple(core.bg);
  const card = hexToHslTriple(core.surface);

  return {
    "--background": background,
    "--foreground": hexToHslTriple(core.ink),
    "--card": card,
    "--card-foreground": hexToHslTriple(core.ink),
    "--popover": card,
    "--popover-foreground": hexToHslTriple(core.ink),
    "--primary": accentTriple,
    "--primary-foreground": pickPrimaryForeground(accentTriple, [
      hexToHslTriple(core.ink),
      card,
      background,
    ]),
    "--primary-ink": solveInk(accentTriple, { background, card }, scheme),
    "--secondary": hexToHslTriple(altSurface),
    "--secondary-foreground": hexToHslTriple(core.ink),
    "--muted": hexToHslTriple(altSurface),
    "--muted-foreground": hexToHslTriple(core.muted),
    "--accent": hexToHslTriple(altSurface),
    "--accent-foreground": hexToHslTriple(core.ink),
    // Solved against THIS style's neutrals, not taken verbatim. The red is
    // shared across all eight, but the surfaces beneath it are authored per
    // style - and measuring found sage-garden dark at 3.97 and
    // plum-manuscript dark at 4.49 for inline error text on a card. A style
    // that already clears gets the shared value back unchanged.
    "--destructive": solveDestructive(DESTRUCTIVE[scheme].color, { background, card }, scheme),
    "--destructive-foreground": DESTRUCTIVE[scheme].foreground,
    "--border": hexToHslTriple(core.border),
    "--input": hexToHslTriple(input),
    "--ring": hexToHslTriple(ring),
  };
}
