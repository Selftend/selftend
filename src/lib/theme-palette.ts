import { THEME_HEXES, THEME_PALETTES } from "@/lib/theme";
import { THEME_TOKENS } from "@/src/lib/theme/styles";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useStyleName } from "@/src/lib/style";
import type { ThemeVarName } from "@/src/lib/theme/contract";
import { neutralFieldGradient } from "@/src/lib/theme/chrome";
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

/**
 * The active style's accent as an `hsla()` string builder — the neutral
 * counterpart of `hueHsl`, for the sites a className cannot reach.
 *
 * A hook rather than a plain function, and that is the whole point. #588
 * neutralised a set of imperative colour reads (grounding's glow, badge and
 * progress segments, the single-series line chart) that previously called
 * `hueHsl`, which resolves a FIXED hue and is correct to be fixed — the eight
 * hues are a pinned encoding palette. The accent is not fixed: it is the one
 * token the style axis exists to change. Building it from the static
 * `PRIMARY_TRIPLES` would paint quiet-lilac's violet on all eight palettes,
 * which is the bug the header of this file describes.
 *
 * `alpha` is applied to the active accent's own triple, so a wash stays a wash
 * of whatever accent is selected.
 */
export function useAccentHsl(): (alpha: number) => string {
  const triple = THEME_TOKENS[useStyleName()][useColorSchemeName()]["--primary"];
  const comma = triple.split(/\s+/).join(", ");
  return (alpha: number) => `hsla(${comma}, ${alpha})`;
}

/**
 * The accent's two-stop fade for a chart area fill or a soft glow — the neutral
 * form of `hueGradient`, at the same alphas and in the same order
 * (dense → transparent).
 */
export function useAccentGradient(): [string, string] {
  const accent = useAccentHsl();
  const isDark = useColorSchemeName() === "dark";
  return [accent(isDark ? 0.18 : 0.14), accent(0)];
}

/**
 * The neutral field gradient for the active (style, scheme) — the full-bleed
 * pour behind a module or tool header.
 *
 * The reason this is a hook and not a constant: the stops are derived from the
 * selected palette's accent, and a module-scope read would freeze them on the
 * default violet for everyone who picked anything else.
 */
export function useNeutralFieldGradient(): [string, string] {
  return neutralFieldGradient(useStyleName(), useColorSchemeName() === "dark");
}
