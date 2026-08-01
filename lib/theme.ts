// The app-facing theme surface. Every value here is now a projection of the
// TypeScript token contract (src/lib/theme/) rather than a hand-written copy of
// global.css — #579 inverted that duality, so global.css is the mirror and TS is
// the source. test/theme-contract.test.ts fails the build if the two drift.
//
// What this file adds on top of the contract is the two var groups that are
// deliberately NOT style tokens:
//
//   the 8 hues + hue inks  the pinned encoding palette (src/lib/design-tokens.ts)
//
// `--accent-ink` used to be the second group. It was the room-poured ink, and it
// is gone (#589): no room pours any more, so it always equalled --primary-ink,
// and used outside a room it silently rendered violet - the trap #403 spent a
// sweep on.

import { type Theme } from "expo-router";
import { vars } from "nativewind";

import { HUE_INK_TRIPLES, HUE_NAMES, HUE_TRIPLES } from "@/src/lib/design-tokens";
import { RADIUS, type ColorScheme } from "@/src/lib/theme/contract";
import { DEFAULT_STYLE, STYLE_NAMES, type StyleName } from "@/src/lib/theme/styles";
import {
  navigationTheme,
  themeHex,
  themeHexes,
  themePalette,
  themeTokens,
} from "@/src/lib/theme/projections";

/**
 * Contract tokens as `hsl(…)` strings, for the DEFAULT style.
 *
 * Reach for `useThemePalette()` (src/lib/theme-palette.ts) in anything that
 * renders — this constant cannot know which palette is active, so using it in a
 * component paints quiet-lilac's violet on every other style. It stays for
 * module-scope consumers and tests that legitimately mean "the default".
 */
export const THEME = {
  light: themePalette("light"),
  dark: themePalette("dark"),
};

/** The @react-navigation theme per (style, scheme). */
export const NAV_THEME: Record<StyleName, Record<ColorScheme, Theme>> = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    { light: navigationTheme("light", style), dark: navigationTheme("dark", style) },
  ]),
) as Record<StyleName, Record<ColorScheme, Theme>>;

/**
 * The encoding palette as vars — the 8 hues and their inks. These are not style
 * tokens: they encode information the user reads off the colour (the mood ramp,
 * habit colours, the breathing pacer), so they stay pinned across styles rather
 * than re-tinting with the active palette (#558).
 */
function encodingVars(scheme: ColorScheme): Record<string, string> {
  return Object.fromEntries(
    HUE_NAMES.flatMap((hue) => [
      [`--${hue}`, HUE_TRIPLES[hue][scheme]],
      [`--${hue}-ink`, HUE_INK_TRIPLES[hue][scheme]],
    ]),
  );
}

function varValues(scheme: ColorScheme, style: StyleName = DEFAULT_STYLE): Record<string, string> {
  const tokens = themeTokens(scheme, style);
  return {
    ...tokens,
    // Style-independent, so it is emitted from the constant rather than read off
    // a style: no palette may reshape the app's controls (#555 §2).
    "--radius": RADIUS,
    ...encodingVars(scheme),
  };
}

/**
 * The plain var records for every (style, scheme), built once at module load.
 *
 * Eager rather than lazy because the identity of these objects is load-bearing:
 * the web mirror keys a `useEffect` on one, so a record rebuilt per render would
 * re-write every custom property on `<html>` on every pass. Sixteen small
 * records is a cheaper price than that.
 */
const VAR_VALUES = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    { light: varValues("light", style), dark: varValues("dark", style) },
  ]),
) as Record<StyleName, Record<ColorScheme, Record<string, string>>>;

/**
 * The var record for a (style, scheme) — what the web mirrors onto
 * `documentElement` so portalled surfaces resolve the active palette. Returns
 * the same object for the same arguments, every time.
 */
export function themeVarValues(scheme: ColorScheme, style: StyleName): Record<string, string> {
  return VAR_VALUES[style][scheme];
}

/**
 * The default style's records, in plain form. Exported because nativewind's
 * `vars()` output cannot be inspected, and the parity gates need to read what
 * global.css is pinned against.
 */
export const THEME_VAR_VALUES: Record<ColorScheme, Record<string, string>> = VAR_VALUES[
  DEFAULT_STYLE
];

/**
 * Precomputed nativewind `vars()` objects for every (style, scheme), applied as
 * the app root's `style`. Same reasoning as VAR_VALUES: a fresh object each
 * render would give the root View a new style identity on every pass and re-flow
 * the whole tree.
 */
export const THEME_VARIABLES: Record<
  StyleName,
  Record<ColorScheme, ReturnType<typeof vars>>
> = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    { light: vars(VAR_VALUES[style].light), dark: vars(VAR_VALUES[style].dark) },
  ]),
) as Record<StyleName, Record<ColorScheme, ReturnType<typeof vars>>>;

/**
 * Every contract token as `hsl(…)` / `#rrggbb`, per (style, scheme).
 *
 * Precomputed at module load so a component reading one gets a STABLE object
 * identity: building the palette inside a hook would hand every dependent
 * `useMemo`, `useEffect` and `React.memo` a new object on each render. The
 * whole table is 8 styles x 2 schemes x 20 tokens — small enough that computing
 * it eagerly is cheaper than memoising it lazily.
 *
 * Read these through the hooks in src/lib/theme-palette.ts, which know which
 * style is active.
 */
export const THEME_PALETTES = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    { light: themePalette("light", style), dark: themePalette("dark", style) },
  ]),
) as Record<StyleName, Record<ColorScheme, ReturnType<typeof themePalette>>>;

export const THEME_HEXES = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    { light: themeHexes("light", style), dark: themeHexes("dark", style) },
  ]),
) as Record<StyleName, Record<ColorScheme, ReturnType<typeof themeHexes>>>;

// Concrete hex mirrors of the surface tokens for the DEFAULT style. As with
// THEME above, anything that renders wants useThemeHex() instead — these cannot
// know which palette is active. Read back off the contract, so they cannot
// advertise a colour the app does not paint.
export const CARD_COLOR = {
  light: themeHex("--card", "light"),
  dark: themeHex("--card", "dark"),
};

export const POPOVER_COLOR = {
  light: themeHex("--popover", "light"),
  dark: themeHex("--popover", "dark"),
};
