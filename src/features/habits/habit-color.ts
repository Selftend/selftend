// Stored habit `color` values are an alias layer over the design-token hues.
// Four of the seven names — amber, emerald, violet, rose — predate the token
// system and used to render raw Tailwind palette literals, so they missed
// palette retunes, carried hand-picked dark variants, and had no contrast
// certification (#278). Each now points at its nearest token hue.
//
// The stored strings deliberately stay as they are: aliasing costs nothing and
// keeps every existing habit row (and the encrypted habits view) untouched.
// The user-facing label for each color lives in the habits i18n namespace
// under `form.colors.*` and follows the hue it now resolves to.

import type { HabitColor } from "@/src/features/habits/types";
import type { TintToken } from "@/src/lib/design-tokens";
import { chipHsl, type ChipColors } from "@/src/lib/hue-chip";
import type { ColorSchemeName } from "@/src/lib/module-room";
import { useColorSchemeName } from "@/src/lib/use-room-style";

export const HABIT_COLOR_TINTS: Record<HabitColor, TintToken> = {
  primary: "primary",
  be: "be",
  act: "act",
  // amber → think's gold, emerald → mist's teal, violet → iris, rose → clay's
  // terracotta: the nearest token hue to each retired literal.
  amber: "think",
  emerald: "mist",
  violet: "iris",
  rose: "clay",
};

const PALETTE: Record<ColorSchemeName, Record<HabitColor, ChipColors>> = (() => {
  const light = {} as Record<HabitColor, ChipColors>;
  const dark = {} as Record<HabitColor, ChipColors>;
  for (const color of Object.keys(HABIT_COLOR_TINTS) as HabitColor[]) {
    const colors = chipHsl(HABIT_COLOR_TINTS[color]);
    light[color] = colors.light;
    dark[color] = colors.dark;
  }
  return { light, dark };
})();

/** A habit color's chip stops in one scheme. Node-side callers and tests. */
export function habitChipColors(color: HabitColor, scheme: ColorSchemeName): ChipColors {
  return PALETTE[scheme][color];
}

/**
 * The whole habit chip palette for the current scheme. Returns the map rather
 * than one color's stops so a screen can read it once and index it inside a
 * render loop — the learn screens draw a chip per card, and the rules of hooks
 * forbid a per-color hook there. Identity-stable per scheme.
 */
export function useHabitChipPalette(): Record<HabitColor, ChipColors> {
  return PALETTE[useColorSchemeName()];
}
