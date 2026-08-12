// Where hue survives, and on what terms (#585, ruled on #558).
//
// The governing rule, verbatim from the spec:
//
//   > Hue survives only where colour carries information the user reads off it
//   > — a scale, a live state readout, or a colour the user chose.
//   > "Distinguishes items in a set" is explicitly NOT enough.
//
// That second sentence is the whole ruling. Almost every hue in the app today
// passes the weaker test — module badges, sidebar icons, room envelopes and
// field gradients all distinguish one module from another — and every one of
// them goes neutral. Module identity is icon and label.
//
// This module exists so the migrate batches (#586-#588) have something to check
// against rather than a paragraph to remember, and so a future contributor
// adding a hue has to say which kind it is.

import type { HueName } from "@/src/lib/design-tokens";

/**
 * How an encoding relates to the palette, which decides whether it may re-tint
 * when the user picks a different style.
 *
 * - `relative` — the colour's MEANING is its position on a scale; the specific
 *   hue is arbitrary. A mood heatmap says "worse → better" by getting darker,
 *   and it says that just as well in any palette. These may re-tint.
 *
 * - `categorical` — the colour IS the datum. A habit the user painted green is
 *   green because they chose green; a pacer phase is identified by its colour
 *   across every session. Re-tinting these would silently repaint the user's
 *   own data, which is why they are pinned to the encoding palette regardless
 *   of the active style.
 *
 * The distinction is not cosmetic. Getting it backwards means either a heatmap
 * that clashes with amber-noir, or a user's habit colours changing under them
 * because they tried a palette.
 */
export type EncodingKind = "relative" | "categorical";

export interface HueEncoding {
  /** Stable id, used by the migrate batches and by the tests below. */
  id: string;
  kind: EncodingKind;
  /** What the user reads off the colour — the justification, in one line. */
  reads: string;
}

/**
 * The complete list of surfaces that keep hue. Anything not here goes neutral.
 *
 * Four entries. All came through #558's rule: three from its own table, one -
 * the colour a user picks for a custom breathing exercise - found by #588's
 * tree-wide sweep. #558 never reviewed that surface, and its rule admits it.
 *
 * The list is still narrow and still exact: a fifth entry needs an answer to
 * "what does the user read off this colour that they could not read off its icon
 * and label?"
 */
// `as const satisfies …`, NOT a `readonly HueEncoding[]` annotation. An
// annotation is checked against the literal but also WIDENS it, so every `id`
// becomes `string` before `HueEncodingId` is derived from it below - leaving
// that type as plain `string` and letting a misspelled surface id compile and
// silently answer "not a keeps-hue surface". `satisfies` gets the same
// checking without the widening.
export const HUE_ENCODINGS = [
  {
    id: "mood-heatmap-ramp",
    kind: "relative",
    reads: "a 5-step scale — how the day scored, by depth of colour",
  },
  // "mood-scale" left this list with the 2a redesign: the bare-emoji input
  // control encodes selection in size and opacity, never in hue.
  {
    id: "habit-colour",
    kind: "categorical",
    reads: "the colour the user chose for that habit",
  },
  {
    id: "breathing-pacer",
    kind: "categorical",
    // Since #779 the pacer wears the RUNNING PATTERN's colour - the same
    // categorical datum its overview row, setup tab and timing bar wear - so
    // the session screen and the screens around it agree on what colour "this
    // pattern" is. Phase is carried by size, ring position and text, not hue.
    reads: "which pattern is running — the colour its row, tab and timing bar wear",
  },
  // The one below was NOT in #558's table, and that is worth stating plainly
  // rather than burying: the sweep found it, and the rule admits it.
  //
  // #558 gave a rule and then applied it to the sites it had reviewed. It never
  // reviewed the custom-breathing builder, so it does not appear in the list of
  // four. Applying the rule as written admits it, and the alternative is not
  // "simpler chrome" but a deleted feature. Flagged on the PR for the owner;
  // the conservative move is to keep a colour the rule protects, not to delete
  // one because a list was written before the surface was looked at.
  {
    id: "breathing-exercise-colour",
    kind: "categorical",
    reads: "the colour the user chose for a custom breathing exercise",
  },
  // "sleep-quality-ramp" left this list with the sleep redesign (#771, removed
  // by #855). #588's sweep had admitted it - the 5-step night-quality ramp on
  // sleep's ink hue - but the redesign deliberately took the data out of hue:
  // the duration chart went uniform (#772), the quality-mix chart carries the
  // level in words (#773), and the recent list and detail carry it as dot count
  // plus the level's name (#775). Sleep now encodes nothing in colour, so there
  // is no ramp left for this entry to protect.
] as const satisfies readonly HueEncoding[];

export type HueEncodingId = (typeof HUE_ENCODINGS)[number]["id"];

// Keyed by `string`, not by `HueEncodingId`, on purpose. `HueEncodingId` is the
// narrow union so that code which MEANS a specific surface gets checked, but the
// three lookups below are runtime questions asked about arbitrary ids - a lint
// rule scanning files, a test asserting an unknown id answers "no". Narrowing
// the key would make "is this a keeps-hue surface?" unaskable about anything
// that might not be one, which is the only reason to ask.
const BY_ID = new Map<string, HueEncoding>(
  HUE_ENCODINGS.map((encoding) => [encoding.id, encoding]),
);

export function hueEncoding(id: string): HueEncoding | undefined {
  return BY_ID.get(id);
}

/**
 * True when a surface is allowed to keep hue at all. The migrate batches ask
 * this; everything it says no to becomes neutral chrome.
 */
export function keepsHue(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * True when a surface's colours are pinned to the encoding palette and must NOT
 * re-tint with the active style.
 *
 * The failure this prevents is quiet rather than loud: nothing crashes, the user
 * simply finds that the habit they painted `act` green is now a different
 * colour because they tried `amber-noir` — their data, repainted by a chrome
 * setting they had no reason to connect it to.
 */
export function isPinnedEncoding(id: string): boolean {
  return BY_ID.get(id)?.kind === "categorical";
}

/**
 * The hues themselves stay exactly as they are. They are no longer style tokens
 * (#559) — they are a small fixed palette that exists for the four surfaces
 * above, and they do not vary with the active style.
 */
export type EncodingHue = HueName;
