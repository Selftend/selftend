// The app-facing theme surface. Every value here is now a projection of the
// TypeScript token contract (src/lib/theme/) rather than a hand-written copy of
// global.css — #579 inverted that duality, so global.css is the mirror and TS is
// the source. test/theme-contract.test.ts fails the build if the two drift.
//
// What this file adds on top of the contract is the two var groups that are
// deliberately NOT style tokens:
//
//   the 8 hues + hue inks  the pinned encoding palette (src/lib/design-tokens.ts)
//   --accent-ink           the room-poured ink, kept alive only until the
//                          call-site sweep retires it (#585-#589)

import { type Theme } from "expo-router";
import { vars } from "nativewind";

import { HUE_INK_TRIPLES, HUE_NAMES, HUE_TRIPLES } from "@/src/lib/design-tokens";
import { RADIUS, type ColorScheme } from "@/src/lib/theme/contract";
import { navigationTheme, themeHex, themePalette, themeTokens } from "@/src/lib/theme/projections";

/** Contract tokens as `hsl(…)` strings for the call sites no class reaches. */
export const THEME = {
  light: themePalette("light"),
  dark: themePalette("dark"),
};

export const NAV_THEME: Record<ColorScheme, Theme> = {
  light: navigationTheme("light"),
  dark: navigationTheme("dark"),
};

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

function varValues(scheme: ColorScheme): Record<string, string> {
  const tokens = themeTokens(scheme);
  return {
    ...tokens,
    // Style-independent, so it is emitted from the constant rather than read off
    // a style: no palette may reshape the app's controls (#555 §2).
    "--radius": RADIUS,
    // Legacy, and this is today's value, not the end state: outside a module
    // room there is no hue, so the room-poured accent ink falls back to the app
    // accent. src/lib/module-room.ts re-pours it per hue inside a room. It has
    // no home in the contract because once rooms go neutral (#558) nothing
    // pours it and it collapses onto --primary-ink. Deleted for real in #589.
    "--accent-ink": tokens["--primary"],
    ...encodingVars(scheme),
  };
}

/**
 * The plain var record applied at the app root, before nativewind's `vars()`
 * wraps it into an opaque style object. Exported in this form because the
 * wrapped object cannot be inspected — the parity gates read this.
 */
export const THEME_VAR_VALUES: Record<ColorScheme, Record<string, string>> = {
  light: varValues("light"),
  dark: varValues("dark"),
};

export const THEME_VARIABLES = {
  light: vars(THEME_VAR_VALUES.light),
  dark: vars(THEME_VAR_VALUES.dark),
};

// Concrete hex mirrors of the surface tokens for code that needs a literal
// colour (gradient fade targets, tooltip backgrounds). Read back off the
// contract, so they cannot advertise a colour the app does not paint — the
// hand-maintained copies they replaced needed their own parity test.
export const CARD_COLOR = {
  light: themeHex("--card", "light"),
  dark: themeHex("--card", "dark"),
};

export const POPOVER_COLOR = {
  light: themeHex("--popover", "light"),
  dark: themeHex("--popover", "dark"),
};
