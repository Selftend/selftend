// Single TypeScript source of truth for the raw hue HSL triples (light + dark),
// space-separated exactly as written in global.css. The hand-written global.css
// stays (NativeWind needs it at build time); test/theme-token-sync.test.ts
// asserts CSS ↔ TS parity so drift fails CI. Consumers that cannot read CSS
// variables (LinearGradient, reanimated, SVG) reach these triples only through
// hueHsl()/hueRamp() in src/features/mindfulness/exercise-hue.ts.

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
// test/theme-token-sync.test.ts (the neutral app surface, `text-<hue>-ink`) and
// test/room-contrast.test.ts (the room surfaces, `text-accent-ink`).
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
 * Not to be confused with `--accent-ink`, which is the *room-poured* ink and
 * falls back to the raw `--primary` outside a room (test/theme-token-sync.test.ts
 * pins that). Room-less `text-accent-ink` is a separate call-site question that
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
 * `primary` is not a hue, but it does now have an ink of its own
 * (PRIMARY_INK_TRIPLES above, #421 §3). It was the last tint here still writing
 * a raw accent as text: 4.41:1 on the sidebar's Beta chip, 3.89 where that chip
 * sits on a primary-tinted card, and 4.22 / 3.54 for the same two in dark.
 */
export const TINT_TEXT: Record<TintToken, string> = {
  primary: "text-primary-ink",
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
 * The washes a TINT_ACCENT mark is actually painted on, faintest → densest.
 * Every one is a tint of the mark's *own* hue, which is the pairing that costs a
 * mark its contrast: the wash pulls the surface toward the very colour the glyph
 * is drawn in. Each alpha is here because a consumer paints it —
 *
 *   0.05  src/components/app/landing/modules-section.tsx   CARD_TINT
 *   0.07  src/components/app/landing/landing-screen.tsx    PILL_TINT
 *   0.10  src/components/app/pillar-card.tsx               TOOL_ICON_BG
 *   0.10  src/components/react-native-reusables/badge.tsx  badgeVariants tint
 *
 * — and contrast falls monotonically as the wash thickens, so 0.10 is the
 * binding case of the three. A denser wash under a glyph would invalidate the
 * floor below without touching it, so test/accent-ink-call-sites.test.ts fails
 * the build if a TINT_ACCENT consumer paints one.
 */
export const MARK_WASH_ALPHAS = [0.05, 0.07, 0.1] as const;

/**
 * A tint used as a NON-TEXT mark: icons, rules, dots. WCAG 1.4.11's 3:1 floor
 * rather than 1.4.3's 4.5:1, because the accent is what carries the module's
 * identity — darkening a mark to ink reads as disabled.
 *
 * This map used to justify itself with "which the published accents clear". That
 * premise was asserted, never computed, and it is false. Rendered on the
 * signed-out landing page, `think`'s glyph measures 1.80:1 (#433). `think` is a
 * light gold whose accent is already 1.88 on the *bare* app background, before
 * any wash — there is no surface in the product where it reads as a mark, so it
 * is the one tint whose mark is its ink. Dark mode is unaffected either way:
 * `--think-ink` IS the published accent there, by construction.
 *
 * The premise is a derivation now rather than a claim. For every tint,
 * test/theme-token-sync.test.ts measures the accent on every MARK_WASH_ALPHAS
 * wash over both neutral surfaces and, for the hues, the room its own hue pours,
 * in both schemes — then asserts this map holds the accent exactly where that
 * worst case clears 3.0 and the ink where it does not. Light worst cases:
 *
 *   comfortable  primary 4.38 · aqua 4.27 · ink 4.17 · be 4.13
 *   thin         act 3.24 · clay 3.12 · mist 3.09 · iris 3.00
 *   below floor  think 1.76 → text-think-ink
 *
 * `iris` clears by 0.0023, on the iris room's own background at /0.10. That is a
 * pass and it is not a comfortable one; the derivation is what keeps it honest,
 * so a retune costing iris any luminance moves it to ink and fails the build
 * rather than shipping a mark nobody re-measured.
 *
 * Reach for this only where the mark carries no text. If it renders a glyph beside
 * a label, the label takes `TINT_TEXT` and the glyph takes this, which is the
 * split #411 established for the other shared colour maps.
 */
export const TINT_ACCENT: Record<TintToken, string> = {
  primary: "text-primary",
  act: "text-act",
  be: "text-be",
  think: "text-think-ink",
  aqua: "text-aqua",
  iris: "text-iris",
  ink: "text-ink",
  clay: "text-clay",
  mist: "text-mist",
};
