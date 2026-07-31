// Projections of the token contract for consumers a CSS class cannot reach
// (#559). Class-based tokens cover most of the app; these three cover the rest,
// and they are required, not optional — each one is a place where a missing
// projection shows up as a screen painting the wrong palette.
//
//   navigationTheme  @react-navigation reads a JS object, not CSS variables, so
//                    the header/card/border colours it draws need their own
//                    projection off the same tokens.
//   themePalette     hsl() strings for LinearGradient stops, Skia/SVG `color`
//                    props, ActivityIndicator, and anything wrapped in
//                    createAnimatedComponent (which bypasses NativeWind).
//   themeHexes       raw hex for the build-time surfaces with no app root at
//                    all — the web first-paint shell, the splash, the widget
//                    (#564).
//
// All three read back off THEME_TOKENS rather than re-listing values, so a
// projection can never advertise a colour the app does not paint.

import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

import { hslTripleToHex } from "./color";
import { THEME_VAR_NAMES, type ColorScheme, type ThemeTokens, type ThemeVarName } from "./contract";
import { DEFAULT_STYLE, THEME_TOKENS, type StyleName } from "./styles";

/** The resolved contract for one (style, scheme). */
export function themeTokens(
  scheme: ColorScheme,
  style: StyleName = DEFAULT_STYLE,
): Readonly<ThemeTokens> {
  return THEME_TOKENS[style][scheme];
}

/** "--card-foreground" → "cardForeground". */
function camelCase(name: ThemeVarName): string {
  return name.replace(/^--/, "").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

const PALETTE_KEYS = THEME_VAR_NAMES.map((name) => [name, camelCase(name)] as const);

type StripDashes<S extends string> = S extends `--${infer Rest}` ? Rest : S;

type Camel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : S;

/** The contract, keyed camelCase — `primary`, `cardForeground`, `primaryInk`, … */
export type ThemePalette = { [K in ThemeVarName as Camel<StripDashes<K>>]: string };

/**
 * Every contract token as an `hsl(…)` string, keyed camelCase — what
 * `THEME[scheme]` has always been, now read off the contract instead of a second
 * hand-written copy.
 */
export function themePalette(scheme: ColorScheme, style: StyleName = DEFAULT_STYLE): ThemePalette {
  const tokens = themeTokens(scheme, style);
  return Object.fromEntries(
    PALETTE_KEYS.map(([name, key]) => [key, `hsl(${tokens[name]})`]),
  ) as ThemePalette;
}

/**
 * Every contract token as `#rrggbb`. Round-tripping through the integer H/S%/L%
 * triple can move a channel by less than 1/255 — invisible, and the price of
 * having one source rather than a hand-maintained hex mirror that drifts.
 */
export function themeHexes(
  scheme: ColorScheme,
  style: StyleName = DEFAULT_STYLE,
): Record<ThemeVarName, string> {
  const tokens = themeTokens(scheme, style);
  return Object.fromEntries(
    THEME_VAR_NAMES.map((name) => [name, hslTripleToHex(tokens[name])]),
  ) as Record<ThemeVarName, string>;
}

/** One contract token as `#rrggbb`. */
export function themeHex(
  name: ThemeVarName,
  scheme: ColorScheme,
  style: StyleName = DEFAULT_STYLE,
): string {
  return hslTripleToHex(themeTokens(scheme, style)[name]);
}

/**
 * The @react-navigation theme for a (style, scheme). `notification` is the
 * badge/alert colour react-navigation paints, which is `destructive` here.
 */
export function navigationTheme(scheme: ColorScheme, style: StyleName = DEFAULT_STYLE): Theme {
  const tokens = themeTokens(scheme, style);
  const hsl = (name: ThemeVarName) => `hsl(${tokens[name]})`;
  return {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      background: hsl("--background"),
      border: hsl("--border"),
      card: hsl("--card"),
      notification: hsl("--destructive"),
      primary: hsl("--primary"),
      text: hsl("--foreground"),
    },
  };
}
