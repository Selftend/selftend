// The Direction B "Color field" room formula (design redesign map #228, spec
// #233, prototype prototypes/mood-directions-230/b-color-field.html in the
// Selftend Design System design project). A module screen becomes a "room" by
// re-pouring the neutral surface tokens as a low-chroma tint of its hue:
// background, cards one step lighter, borders/wells/ink all nudged toward the
// hue. Light rooms are a pale wash; dark rooms follow the validated
// tinted-room formula (low-chroma pour of the hue as the field, cards one
// step lighter — the hue accents themselves are already brightened in dark
// via HUE_TRIPLES).
//
// Only the lightness/saturation recipe lives here; the hue degree comes from
// the hue source of truth in src/lib/design-tokens.ts, so a palette retune
// re-tints every room automatically.

import { vars } from "nativewind";

import { HUE_TRIPLES, type HueName } from "@/src/lib/design-tokens";

export type ColorSchemeName = "light" | "dark";

/** The leading hue degree of a module hue, e.g. "be" → 330. */
export function hueDegree(hue: HueName): number {
  return Number.parseInt(HUE_TRIPLES[hue].light, 10);
}

/**
 * Space-separated HSL triples for the surface tokens a room re-pours,
 * keyed by CSS variable name (without the leading `--`).
 */
export function roomTriples(hue: HueName): Record<ColorSchemeName, Record<string, string>> {
  const h = hueDegree(hue);
  return {
    light: {
      background: `${h} 32% 95%`,
      foreground: `${h} 22% 14%`,
      card: `${h} 30% 99%`,
      "card-foreground": `${h} 22% 15%`,
      secondary: `${h} 16% 91%`,
      "secondary-foreground": `${h} 12% 24%`,
      muted: `${h} 24% 92%`,
      "muted-foreground": `${h} 8% 40%`,
      accent: `${h} 28% 92%`,
      "accent-foreground": `${h} 28% 25%`,
      border: `${h} 15% 88%`,
      input: `${h} 15% 88%`,
    },
    dark: {
      background: `${h} 15% 9%`,
      foreground: `${h} 20% 95%`,
      card: `${h} 12% 15%`,
      "card-foreground": `${h} 20% 95%`,
      secondary: `${h} 10% 22%`,
      "secondary-foreground": `${h} 20% 92%`,
      muted: `${h} 12% 18%`,
      "muted-foreground": `${h} 10% 68%`,
      accent: `${h} 14% 24%`,
      "accent-foreground": `${h} 24% 93%`,
      border: `${h} 10% 24%`,
      input: `${h} 10% 22%`,
    },
  };
}

/**
 * NativeWind variable overrides that turn a screen subtree into the module's
 * room. Apply to the screen root: `style={roomVariables(hue)[colorScheme]}`
 * (same pattern as THEME_VARIABLES at the app root) — every `bg-background` /
 * `bg-card` / `text-muted-foreground` inside re-resolves to the room pour.
 */
export function roomVariables(hue: HueName): Record<ColorSchemeName, ReturnType<typeof vars>> {
  const triples = roomTriples(hue);
  const toVars = (scheme: ColorSchemeName) =>
    vars(
      Object.fromEntries(
        Object.entries(triples[scheme]).map(([token, value]) => [`--${token}`, value]),
      ),
    );
  return { light: toVars("light"), dark: toVars("dark") };
}

/**
 * The full-bleed field gradient behind a module header, top → bottom stops.
 * Comma-form hsl() strings because LinearGradient cannot read CSS variables
 * (same escape hatch as hueHsl in src/features/mindfulness/exercise-hue.ts).
 */
export function fieldGradient(hue: HueName, isDark: boolean): [string, string] {
  const h = hueDegree(hue);
  return isDark
    ? [`hsl(${h}, 34%, 20%)`, `hsl(${h}, 40%, 12%)`]
    : [`hsl(${h}, 50%, 42%)`, `hsl(${h}, 58%, 32%)`];
}
