import { THEME_HEXES, THEME_PALETTES } from "@/lib/theme";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useStyleName } from "@/src/lib/style";
import type { ThemeVarName } from "@/src/lib/theme/contract";
import type { ThemePalette } from "@/src/lib/theme/projections";

// Imperative theme reads for the handful of call sites a className cannot
// reach: LinearGradient stops, Skia/SVG `color` props, ActivityIndicator, and
// anything wrapped in createAnimatedComponent (which bypasses NativeWind
// entirely).
//
// These exist because the module-level `THEME` / `CARD_COLOR` constants in
// lib/theme.ts resolve the DEFAULT style and cannot know which palette is
// active. Reading one inside a component paints quiet-lilac's violet on every
// other palette — a bug that is invisible until someone switches style, which
// is precisely why the hooks land in the same ticket as the axis (#582).
//
// Prefer a Tailwind token class wherever one works. Every read here is an
// exception, and each one has to be told the active style by hand.

/** Every contract token as an `hsl(…)` string, for the active (style, scheme). */
export function useThemePalette(): ThemePalette {
  return THEME_PALETTES[useStyleName()][useColorSchemeName()];
}

/** One contract token as `#rrggbb`, for the active (style, scheme). */
export function useThemeHex(name: ThemeVarName): string {
  return THEME_HEXES[useStyleName()][useColorSchemeName()][name];
}
