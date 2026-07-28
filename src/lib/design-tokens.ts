// Single TypeScript source of truth for the raw hue HSL triples (light + dark),
// space-separated exactly as written in global.css. The hand-written global.css
// stays (NativeWind needs it at build time); test/theme-token-sync.test.ts
// asserts CSS ↔ TS parity so drift fails CI. Consumers that cannot read CSS
// variables (LinearGradient, reanimated, SVG) reach these triples only through
// hueHsl()/hueRamp() in src/features/mindfulness/exercise-hue.ts.

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
// test/theme-token-sync.test.ts (the neutral app surface, `text-<hue>-ink`) and
// test/room-contrast.test.ts (the room surfaces, `text-accent-ink`).
//
// Dark mode keeps the published accent untouched: it already clears 5.81:1 at
// worst there, so a dark-mode darkening would be a visual change buying nothing.
export const HUE_INK_LIGHTNESS = 28;

function inkTriples(hue: HueName): SchemeTriples {
  const match = HUE_TRIPLES[hue].light.match(/^(\d+)\s+(\d+)%\s+\d+%$/);
  if (!match) throw new Error(`Unparseable hue triple for "${hue}": ${HUE_TRIPLES[hue].light}`);
  return {
    light: `${match[1]} ${match[2]}% ${HUE_INK_LIGHTNESS}%`,
    dark: HUE_TRIPLES[hue].dark,
  };
}

/**
 * Every hue as ink that clears WCAG AA for small text on the neutral app
 * surface — `text-<hue>-ink`, the room-less counterpart of the room-poured
 * `text-accent-ink`. A module room re-pours `--accent-ink` from these same
 * values (src/lib/module-room.ts), so inside a room the two are the same colour
 * by construction rather than by coincidence.
 *
 * `text-<hue>` remains correct for icons, large numerals and anything
 * decorative — this is the small-text token, not a replacement for the accent.
 */
export const HUE_INK_TRIPLES: Record<HueName, SchemeTriples> = Object.fromEntries(
  HUE_NAMES.map((hue) => [hue, inkTriples(hue)]),
) as Record<HueName, SchemeTriples>;

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

// The app-wide 5-step score/quality encoding: background classes at the same
// alphas as RAMP_ALPHAS in src/features/mindfulness/exercise-hue.ts (hueRamp,
// which feeds the heatmap) — test/hue-ramp-classes.test.ts enforces the match.
// Class literals are written out in full so NativeWind compiles them.
export const HUE_RAMP_CLASSES: Record<HueName, readonly [string, string, string, string, string]> =
  {
    mist: ["bg-mist/[0.16]", "bg-mist/[0.32]", "bg-mist/[0.52]", "bg-mist/[0.74]", "bg-mist"],
    iris: ["bg-iris/[0.16]", "bg-iris/[0.32]", "bg-iris/[0.52]", "bg-iris/[0.74]", "bg-iris"],
    be: ["bg-be/[0.16]", "bg-be/[0.32]", "bg-be/[0.52]", "bg-be/[0.74]", "bg-be"],
    ink: ["bg-ink/[0.16]", "bg-ink/[0.32]", "bg-ink/[0.52]", "bg-ink/[0.74]", "bg-ink"],
    act: ["bg-act/[0.16]", "bg-act/[0.32]", "bg-act/[0.52]", "bg-act/[0.74]", "bg-act"],
    clay: ["bg-clay/[0.16]", "bg-clay/[0.32]", "bg-clay/[0.52]", "bg-clay/[0.74]", "bg-clay"],
    think: ["bg-think/[0.16]", "bg-think/[0.32]", "bg-think/[0.52]", "bg-think/[0.74]", "bg-think"],
    aqua: ["bg-aqua/[0.16]", "bg-aqua/[0.32]", "bg-aqua/[0.52]", "bg-aqua/[0.74]", "bg-aqua"],
  };

/**
 * Background class for a 1-5 score/quality step on a hue's ramp, faintest →
 * fullest. Non-integer or out-of-range steps round and clamp into 1..5 —
 * callers that instead want a neutral fallback for invalid input handle that
 * before calling (see mood's scoreToneClass).
 */
export function hueRampClass(hue: HueName, step: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(step)));
  return HUE_RAMP_CLASSES[hue][clamped - 1];
}

/**
 * A tint used as TEXT. Every hue resolves to its ink (#403), never the published
 * accent — this map feeds `Text`'s `tint` prop, and a `tint` on a text component
 * is by definition text.
 *
 * It used to hold the raw accents as arbitrary values (`text-[hsl(var(--act))]`),
 * which failed AA on ~78 sites including the signed-out landing page, where nine
 * of ten hue labels measured below 4.5:1 — `think` at 1.80. Every label sits on a
 * tint of its own hue, so even `be`, `aqua` and `ink`, which clear the floor on a
 * plain surface, failed there (4.40 / 4.44 / 4.45).
 *
 * The arbitrary-value form is also why nothing caught it: the static gates match
 * `text-<hue>`, and `text-[` is not that. Written as plain classes now, so the
 * gates can see this map at all (#421).
 *
 * `primary` is not a hue and has no ink; it measures 4.41:1 on `bg-primary/10`
 * and is tracked separately (#421 §3).
 */
export const TINT_TEXT: Record<TintToken, string> = {
  primary: "text-primary",
  act: "text-act-ink",
  be: "text-be-ink",
  think: "text-think-ink",
  aqua: "text-aqua-ink",
  iris: "text-iris-ink",
  ink: "text-ink-ink",
  clay: "text-clay-ink",
  mist: "text-mist-ink",
};

/**
 * A tint used as a NON-TEXT mark: icons, rules, dots. WCAG 1.4.11's 3:1 floor
 * rather than 1.4.3's 4.5:1, which the published accents clear, and the accent is
 * what carries the module's identity — darkening an icon to ink reads as disabled.
 *
 * Reach for this only where the mark carries no text. If it renders a glyph beside
 * a label, the label takes `TINT_TEXT` and the glyph takes this, which is the
 * split #411 established for the other shared colour maps.
 */
export const TINT_ACCENT: Record<TintToken, string> = {
  primary: "text-primary",
  act: "text-act",
  be: "text-be",
  think: "text-think",
  aqua: "text-aqua",
  iris: "text-iris",
  ink: "text-ink",
  clay: "text-clay",
  mist: "text-mist",
};
