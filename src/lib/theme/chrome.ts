// The neutral primitives the migrate batches move call sites onto (#585).
//
// This is the expand half of expand-contract. Nothing here is used yet, and
// nothing visual changes in this ticket - the hue forms all still exist beside
// these, which is what lets #586, #587 and #588 each land green on their own.
// The blast radius measured 470 hue class occurrences across 91 files; a single
// edit would break call sites faster than one ticket could fix them.
//
// Each constant is a ROLE, not a colour. `CHROME_MARK` says "this glyph is
// chrome" - and the day the neutral for chrome glyphs changes, it changes in one
// place rather than across ninety-one files. That is the difference between this
// sweep and the previous three, which each replaced one literal with another.
//
// What has no primitive here, deliberately: a ROOM. A room's neutral form is not
// a neutral room, it is no room - the app's own surfaces, which every screen
// already has. #586 removes `useRoomStyle` calls rather than swapping them.

import { fieldStopsForDegree } from "@/src/lib/module-room";
import { AA_TEXT, compositeOver, contrastRatio, tripleToRgb } from "@/src/lib/theme/contrast";
import type { Rgb } from "@/src/lib/theme/color";
import { THEME_TOKENS, type StyleName } from "@/src/lib/theme/styles";

/**
 * Body and heading text on any chrome surface.
 *
 * Replaces `text-<hue>-ink` / `text-accent-ink` wherever the text was coloured
 * to say which module you were in. That is exactly the "distinguishes items in a
 * set" case the ruling calls insufficient.
 */
export const CHROME_TEXT = "text-foreground";

/** Secondary text: descriptions, meta lines, counts. */
export const CHROME_MUTED_TEXT = "text-muted-foreground";

/**
 * A non-text mark that carries no information of its own: module and tool
 * icons, sidebar glyphs, decorative dots.
 *
 * `text-muted-foreground` rather than `text-foreground` because these sit
 * beside a label that carries the meaning - a full-strength glyph next to
 * full-strength text reads as two competing emphases.
 */
export const CHROME_MARK = "text-muted-foreground";

/**
 * A mark that IS the interactive affordance - a selected tab's icon, an active
 * row's leading glyph. The app accent, not a module hue.
 */
export const CHROME_ACCENT_MARK = "text-primary";

/** Hairlines: section rules, card borders, dividers. */
export const CHROME_RULE = "border-border";

/** The surface a badge, chip or pill is drawn on. */
export const CHROME_BADGE_SURFACE = "bg-secondary";

/** Text on CHROME_BADGE_SURFACE. */
export const CHROME_BADGE_TEXT = "text-secondary-foreground";

/**
 * The faint wash behind an icon tile or a soft container - the neutral form of
 * `bg-<hue>/10`.
 */
export const CHROME_WASH = "bg-muted";

/** The weakest ink the field header paints: `text-white/[0.88]` body copy. */
const FIELD_INK_ALPHA = 0.88;

const WHITE: Rgb = [255, 255, 255];

/** Both the solid and the 88% white ink clear AA on this field colour. */
function inkClears(h: number, s: number, l: number): boolean {
  const field = tripleToRgb(`${h} ${s}% ${l}%`);
  if (contrastRatio(WHITE, field) < AA_TEXT) return false;
  return contrastRatio(compositeOver(WHITE, FIELD_INK_ALPHA, field), field) >= AA_TEXT;
}

/**
 * The darkest-but-least move off the formula's lightness that keeps white ink
 * legible, or the formula's own value when it already clears.
 */
function solveFieldLightness(h: number, s: number, l: number): number {
  for (let candidate = l; candidate >= 0; candidate -= 1) {
    if (inkClears(h, s, candidate)) return candidate;
  }
  return 0;
}

/**
 * The neutral field gradient: the full-bleed pour behind a module or tool
 * header, in the ACTIVE palette's accent rather than the module's hue.
 *
 * It reuses `fieldStopsForDegree` - the very formula the hue fields use - rather
 * than introducing a second one, so the neutral field and the hue fields stay on
 * one set of contrast floors instead of two that can drift.
 *
 * It takes the style explicitly. The obvious shorter spelling,
 * `fieldGradient("primary", …)`, reads `PRIMARY_TRIPLES` - a module-scope
 * constant holding the DEFAULT palette's violet - so every header migrated onto
 * it would have stayed lilac under all eight palettes, and a test comparing the
 * two would have agreed with itself while the app was visibly wrong. A hue
 * degree cannot be read from a constant here; it has to come from the palette
 * the user actually chose. `useNeutralFieldGradient` in src/lib/theme-palette.ts
 * is the hook that supplies it.
 */
export function neutralFieldGradient(style: StyleName, isDark: boolean): [string, string] {
  // The LIGHT triple's degree in both schemes, matching what `fieldGradient`
  // has always done for the primary field. A palette may nudge its accent hue a
  // degree or two between schemes (quiet-lilac is 262 light, 264 dark) and
  // following that would both re-tint today's shipping field in dark mode and
  // give one palette two field hues. The scheme is already expressed by the
  // saturation and lightness the formula picks.
  const h = Number.parseInt(THEME_TOKENS[style].light["--primary"], 10);
  const [top, bottom] = fieldStopsForDegree(h, isDark).map(parseStop) as [Stop, Stop];

  // The field is SOLVED, not just recoloured — the same finding as #560, one
  // layer up. The formula's 50%/42% was measured against violet, and lightness
  // in HSL is not perceptual luminance, so pouring a green, gold or blue accent
  // through the same numbers puts white ink at 3.1–3.9:1. Four of the eight
  // palettes fail. Darkening until the ink clears is the smallest fix that keeps
  // the field the palette's own colour; pinning it to violet would be the bug
  // this whole primitive exists to remove, and lightening the ink would mean a
  // different ink per palette.
  //
  // The move is applied to BOTH stops equally rather than solved twice, so the
  // gradient keeps its shape instead of flattening when the two stops happen to
  // solve to the same lightness. A palette that already clears (quiet-lilac,
  // which is what shipped) gets a shift of 0 and is byte-identical.
  const shift = top.l - solveFieldLightness(h, top.s, top.l);
  return [
    `hsl(${h}, ${top.s}%, ${Math.max(0, top.l - shift)}%)`,
    `hsl(${h}, ${bottom.s}%, ${Math.max(0, bottom.l - shift)}%)`,
  ];
}

interface Stop {
  s: number;
  l: number;
}

function parseStop(stop: string): Stop {
  const match = stop.match(/^hsl\(\d+,\s*(\d+)%,\s*(\d+)%\)$/);
  if (!match) throw new Error(`Unparseable field stop: "${stop}"`);
  return { s: Number(match[1]), l: Number(match[2]) };
}

/**
 * Every neutral chrome class this module publishes, for the gates in #589 to
 * check a migrated file against. Kept as one list so a role added later cannot
 * be forgotten by the lint rule.
 */
export const CHROME_CLASSES = [
  CHROME_TEXT,
  CHROME_MUTED_TEXT,
  CHROME_MARK,
  CHROME_ACCENT_MARK,
  CHROME_RULE,
  CHROME_BADGE_SURFACE,
  CHROME_BADGE_TEXT,
  CHROME_WASH,
] as const;
