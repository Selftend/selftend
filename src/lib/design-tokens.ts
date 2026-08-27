// Single TypeScript source of truth for the raw hue HSL triples (light + dark),
// space-separated exactly as written in global.css. The hand-written global.css
// stays (NativeWind needs it at build time); test/theme-token-sync.test.ts
// asserts CSS ↔ TS parity so drift fails CI. Consumers that cannot read CSS
// variables (LinearGradient, reanimated, SVG) reach these triples only through
// hueHsl() in src/features/mindfulness/exercise-hue.ts.

import { withLightness } from "@/src/lib/theme/color";

export const HUE_NAMES = ["mist", "iris", "be", "ink", "act", "clay", "think", "aqua"] as const;

export type HueName = (typeof HUE_NAMES)[number];

export interface SchemeTriples {
  light: string;
  dark: string;
}

export const HUE_TRIPLES: Record<HueName, SchemeTriples> = {
  mist: { light: "178 40% 40%", dark: "178 48% 58%" },
  iris: { light: "280 48% 60%", dark: "280 58% 74%" },
  be: { light: "330 56% 47%", dark: "330 62% 72%" },
  ink: { light: "232 46% 54%", dark: "232 56% 72%" },
  act: { light: "160 46% 38%", dark: "160 56% 55%" },
  clay: { light: "20 52% 50%", dark: "20 60% 66%" },
  think: { light: "43 74% 52%", dark: "43 86% 65%" },
  aqua: { light: "196 52% 36%", dark: "196 58% 62%" },
};

export const PRIMARY_TRIPLES: SchemeTriples = { light: "262 62% 56%", dark: "264 72% 72%" };

// The lightness a hue becomes legible *ink* at (#368, #403). A hue's published
// accent above is tuned as a colour — it paints `bg-<hue>` fills, borders,
// chips, field gradients, the pacer ring — not as text, and four of the eight
// carry too much luminance to hold small text in light mode: `think` is 1.88:1
// on the app background, under half of AA's 4.5, plus `iris` 3.42, `clay` 3.51
// and `act` 3.64. Fixing the lightness while keeping the hue's own degree and
// saturation darkens the accent rather than replacing it, so the ink still
// reads as that hue. Darkening the accents themselves is the move NOT taken:
// they carry the product's visual identity, and repainting every hue surface to
// fix its text would be a brand change wearing an accessibility hat.
//
// 28% is the binding number, and it binds on both surfaces a hue's ink can land
// on: `think` clears 5.45 on the app background and 5.51 on its own room's
// background; at 32% both fall under 4.5. Floors live in
// test/theme-token-sync.test.ts. (room-contrast.test.ts held the room surfaces
// until #586 made rooms neutral and deleted it.)
//
// Dark mode keeps the published accent untouched: it already clears 5.81:1 at
// worst there, so a dark-mode darkening would be a visual change buying nothing.
//
// #580 replaced the fixed-lightness recipe for the STYLE accent's ink with a
// solver, because one constant cannot serve eight palettes. This constant
// survives that change and is not an oversight: the eight hues are a pinned
// encoding palette, not style tokens (#558/#559). They are one fixed set of
// colours whose contrast was measured directly, on the surfaces below, and they
// do not vary with the active style — so there is nothing here for a solver to
// generalise over. The floors that certify them still run in
// test/theme-token-sync.test.ts.
export const HUE_INK_LIGHTNESS = 28;

function inkTriples(hue: HueName): SchemeTriples {
  return {
    light: withLightness(HUE_TRIPLES[hue].light, HUE_INK_LIGHTNESS),
    dark: HUE_TRIPLES[hue].dark,
  };
}

/**
 * Every hue as ink that clears WCAG AA for small text on the neutral app
 * surface — `text-<hue>-ink`. (While module rooms existed they re-poured
 * `--accent-ink` from these same values, so the two were one colour by
 * construction; the room surface is gone since #1292.)
 *
 * `text-<hue>` remains correct for icons, large numerals and anything
 * decorative — this is the small-text token, not a replacement for the accent.
 */
export const HUE_INK_TRIPLES: Record<HueName, SchemeTriples> = Object.fromEntries(
  HUE_NAMES.map((hue) => [hue, inkTriples(hue)]),
) as Record<HueName, SchemeTriples>;

// `primary` is not a hue — no HUE_NAMES entry, no room pours it, and every gate
// above is spelled `text-<hue>`, so #403's sweep passed straight over it and
// #421 left it as the one tint with no ink. It needs one for the same reason
// the hues did, and on more screens than any of them: the "Beta" chip in the
// sidebar is `text-primary` at 10px/600 on `bg-primary/15` over the sidebar's
// card — 4.41:1 light, 4.22:1 dark — and the sidebar is on all 20 captured
// screens. `/modules` paints "CBT" the same way at 14px/700 (4.41), and a chip
// nested in a primary-tinted card drops to 3.89 light / 3.54 dark (#421 §3).
//
// Light takes HUE_INK_LIGHTNESS unchanged: same recipe, same 28%, so violet ink
// sits at the same depth as the eight hue inks beside it and still reads as the
// brand colour rather than as near-black. It clears 9.63:1 on the worst surface
// the hue floor checks and 8.00:1 on the deepest tint stack the app can build.
//
// **Dark is where primary differs from every hue, and the difference is real.**
// The rule above — "dark ink is the published accent untouched, it already
// clears 5.81 at worst" — is a measurement, and it is false for primary: on
// `bg-primary/15` over the dark card the raw accent is 4.22, below AA, which is
// the dark half of the same Beta chip. So dark ink lifts lightness instead of
// dropping it, 72% → 80%, keeping degree and saturation exactly as the light
// recipe keeps them. 80% is the binding number and what binds it is the nested
// case: 76% would clear the floor the hues are held to (5.03) while leaving the
// badge-on-a-tinted-card at 4.33, still failing the surface #421 reported. At
// 80% every stack the app's tint alphas can build one level deep clears 4.5
// (4.71 at worst, `/15` on `/15`). Floors live in test/theme-token-sync.test.ts.
export const PRIMARY_INK_LIGHTNESS: Record<keyof SchemeTriples, number> = {
  light: HUE_INK_LIGHTNESS,
  dark: 80,
};

/**
 * The app accent as ink that clears WCAG AA for small text — `text-primary-ink`,
 * the `primary` counterpart of `text-<hue>-ink`.
 *
 * `text-primary` remains correct for icons, large numerals and anything
 * decorative, exactly as `text-<hue>` does; TINT_ACCENT still resolves `primary`
 * to it. This is the small-text token, not a replacement for the accent, and it
 * deliberately does not touch `--primary` itself — that would repaint every
 * violet fill, border and button in the product to fix its text.
 *
 * Not to be confused with the deleted `--accent-ink`, the room-poured ink that
 * fell back to the raw `--primary` outside a room (test/theme-token-sync.test.ts
 * pins its absence). `text-primary-ink` call sites are a separate question that
 * #403's gates already police; this token is for sites that name `primary`.
 */
export const PRIMARY_INK_TRIPLES: SchemeTriples = {
  light: withLightness(PRIMARY_TRIPLES.light, PRIMARY_INK_LIGHTNESS.light),
  dark: withLightness(PRIMARY_TRIPLES.dark, PRIMARY_INK_LIGHTNESS.dark),
};

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

/**
 * Every tint's raw triples in one map, so consumers that accept a TintToken
 * don't each carry their own `tint === "primary" ? PRIMARY_TRIPLES : ...`
 * branch (src/features/mindfulness/exercise-hue.ts already spells this shape
 * out for its stripe colors).
 */
export const TINT_TRIPLES: Record<TintToken, SchemeTriples> = {
  primary: PRIMARY_TRIPLES,
  ...HUE_TRIPLES,
};

// The 5-step score ramp's alphas, faintest → fullest. Shared by the class form
// below (the distribution bar) and the hsla form (useAccentRamp in
// src/lib/theme-palette.ts, which feeds the heatmap) —
// test/accent-ramp-classes.test.ts enforces the match.
export const RAMP_ALPHAS = [0.16, 0.32, 0.52, 0.74, 1] as const;

// The app-wide 5-step score encoding, on the ACTIVE STYLE'S ACCENT (#924).
// Until #924 this was HUE_RAMP_CLASSES, a per-hue table whose only surviving
// reader was mood on the pinned `be` pink — which clashed with every
// non-default style. The `mood-heatmap-ramp` encoding was always `relative`
// (the meaning is the position on the scale, not the hue), so the ramp now
// rides `--primary` and re-tints with the style, the same move the trend line
// made in #588. Class literals are written out in full so NativeWind compiles
// them.
export const ACCENT_RAMP_CLASSES = [
  "bg-primary/[0.16]",
  "bg-primary/[0.32]",
  "bg-primary/[0.52]",
  "bg-primary/[0.74]",
  "bg-primary",
] as const;

/**
 * Background class for a 1-5 score step on the accent ramp, faintest →
 * fullest. Non-integer or out-of-range steps round and clamp into 1..5 —
 * callers that instead want a neutral fallback for invalid input handle that
 * before calling.
 */
export function accentRampClass(step: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(step)));
  return ACCENT_RAMP_CLASSES[clamped - 1];
}

// TINT_TEXT and TINT_ACCENT are gone (#589), and so is MARK_WASH_ALPHAS with
// them.
//
// They were the chrome half of this file: TINT_TEXT resolved a tint to that
// hue's ink for a `<Text>`, TINT_ACCENT to the published accent for a glyph, and
// MARK_WASH_ALPHAS listed the three wash densities a TINT_ACCENT mark was ever
// painted on so the floors could be derived against the worst of them.
//
// Every consumer was chrome and every one is neutral now: badge.tsx and
// pillar-card.tsx and the two landing surfaces (#587), then Text's `tint` prop
// and Card's tinted variants (#588). The maps carried a lot of hard-won
// measurement - `think` at 1.80:1 as a rendered glyph on the signed-out landing
// page, `iris` clearing 3.0 by 0.0023 on its own room's background - and none of
// it survives the surfaces it was measured on.
//
// What remains here is the ENCODING palette: the eight hues, their inks, the
// ramp classes and the triples the four keeps-hue surfaces read. The eslint rule
// in eslint.config.js is what stops a new chrome consumer reaching them.
