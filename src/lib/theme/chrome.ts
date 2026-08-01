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

import { PRIMARY_TRIPLES } from "@/src/lib/design-tokens";
import { fieldGradient } from "@/src/lib/module-room";

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

/**
 * The neutral field gradient: the full-bleed pour behind a module or tool
 * header, in the app accent rather than the module's hue.
 *
 * It delegates to the existing `fieldGradient("primary", …)` rather than
 * introducing a second formula. That path already exists and already ships - the
 * CBT home uses it (#500) - so the neutral field is a surface the app has been
 * painting and holding to its contrast floors for a while, not a new one.
 */
export function neutralFieldGradient(isDark: boolean): [string, string] {
  return fieldGradient("primary", isDark);
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

/**
 * The app accent as a raw `hsla()` string — the neutral counterpart of
 * `hueHsl`, for the sites a class name cannot reach.
 *
 * Reanimated props, SVG fills and `LinearGradient` stops cannot read a CSS
 * variable, so the hue path has always had `hueHsl` as a sanctioned escape
 * hatch. Neutralising those sites (#588) needs the same escape hatch pointed at
 * the accent, which is what this is.
 *
 * KNOWN LIMITATION, and it is inherited rather than introduced: this reads the
 * static `PRIMARY_TRIPLES`, so it does not follow the selected style. Every
 * imperative colour read in the app has that shape today — `fieldGradient`
 * resolves `"primary"` the same way, which means the neutral field gradient
 * #585 shipped is already pinned to the lilac accent under all eight palettes.
 * #557 flagged the general problem (WikiCanvas keeps a `theme-palette.ts` of
 * imperative reads for exactly this); fixing it is one change across every
 * caller, not a per-site decision, so it is not smuggled in here.
 */
export function accentHsl(isDark: boolean, alpha: number): string {
  // Comma form, not the space form the token is stored in. `PRIMARY_TRIPLES`
  // holds `"262 62% 56%"` because that is what a CSS variable wants; `hsla()`
  // wants `hsla(262, 62%, 56%, 1)`, and the space form inside it is silently
  // invalid - react-native-svg warns and paints nothing rather than throwing.
  // `hueHsl` has always done this conversion (`commaTriple`); this is the same
  // conversion for the accent.
  const triple = (isDark ? PRIMARY_TRIPLES.dark : PRIMARY_TRIPLES.light).split(/\s+/).join(", ");
  return `hsla(${triple}, ${alpha})`;
}

/**
 * The accent's two-stop fade, for a chart area fill or a soft glow — the
 * neutral form of `hueGradient`. Same alphas, same order (dense → transparent).
 */
export function accentGradient(isDark: boolean): [string, string] {
  return [accentHsl(isDark, isDark ? 0.18 : 0.14), accentHsl(isDark, 0)];
}
