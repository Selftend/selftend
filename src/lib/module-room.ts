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

/** The saturation percentage of a module hue's light accent, e.g. "be" → 56. */
function hueSaturation(hue: HueName): number {
  const saturation = HUE_TRIPLES[hue].light.match(/\s(\d+)%/)?.[1];
  if (!saturation)
    throw new Error(`Unparseable hue triple for "${hue}": ${HUE_TRIPLES[hue].light}`);
  return Number(saturation);
}

// The lightness the accent ink is fixed to in a light room (#368). A hue's
// published accent is tuned to sit on the neutral app surface, not on the pale
// tint of itself a room pours: `text-think` on the think room's background is
// 1.90:1, well under half of AA's 4.5. Fixing the ink's lightness while keeping
// the hue's own degree and saturation is the same move hue-chip.ts makes for
// chip ink, and the same one roomTriples already makes for `foreground` - it
// darkens the accent rather than replacing it, so a room's ink still reads as
// that room's colour.
//
// 28% is the binding number: the least darkening that clears 4.5 on both room
// surfaces for every hue with headroom to spare. `think` binds it (its 74%
// saturation carries the most luminance of the seven) at 5.51 on background and
// 5.95 on card; at 32% it would fall to 4.43 and fail. Floors are enforced by
// test/room-contrast.test.ts.
//
// Dark rooms keep the published accent untouched: it already clears 5.87:1 at
// worst there, so a dark-mode darkening would be a visual change buying nothing.
const ACCENT_INK_LIGHTNESS = 28;

/**
 * Space-separated HSL triples for the surface tokens a room re-pours,
 * keyed by CSS variable name (without the leading `--`).
 *
 * `accent-ink` is the odd one out: it is not a surface but the room hue itself,
 * darkened until it can carry small text on the surfaces above (`text-accent-ink`
 * — see ACCENT_INK_LIGHTNESS). Do not read it as ink on `accent`; that pairing is
 * `accent-foreground`.
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
      "accent-ink": `${h} ${hueSaturation(hue)}% ${ACCENT_INK_LIGHTNESS}%`,
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
      "accent-ink": HUE_TRIPLES[hue].dark,
      border: `${h} 10% 24%`,
      input: `${h} 10% 22%`,
    },
  };
}

/**
 * NativeWind variable overrides that turn a screen subtree into the module's
 * room — every `bg-background` / `bg-card` / `text-muted-foreground` inside
 * re-resolves to the room pour. Screens consume this via `useRoomStyle(hue)`
 * in src/lib/use-room-style.ts (which carries the scheme read and the cached
 * style identity); importing it directly outside src/lib and tests is
 * lint-restricted.
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

// Per-hue [saturation%, lightness%] field stops for hues the standard recipe
// can't carry: a high-luminance hue (think's yellow, act's green, aqua's
// teal-blue) leaves white ink below AA at the formula's lightness, so its
// room supplies its own S/L instead. The hue
// degree still comes from the token source of truth, so a palette retune
// re-tints overridden fields too. Only the schemes a hue overrides are
// listed — anything absent falls through to the formula. Floors are
// enforced by test/room-contrast.test.ts; the binding constraint is
// 88%-white body ink composited over the top stop (≥ 4.5 needs L ≤ ~32% for
// think, L ≤ ~30% for act's green, L ≤ ~35% for aqua).
const FIELD_STOP_OVERRIDES: Partial<
  Record<HueName, Partial<Record<ColorSchemeName, [[number, number], [number, number]]>>>
> = {
  think: {
    light: [
      [64, 31],
      [70, 25],
    ],
  },
  act: {
    light: [
      [56, 30],
      [62, 24],
    ],
  },
  aqua: {
    light: [
      [56, 34],
      [62, 26],
    ],
  },
  // The gentlest tune: only the top stop misses the floor (4.47 vs 4.5), so
  // the bottom pair deliberately restates the formula's [58, 32].
  clay: {
    light: [
      [52, 40],
      [58, 32],
    ],
  },
};

/**
 * The room's card surface per scheme as comma-form hsl() strings, for native
 * components (LinearGradient fades) that can't read the CSS variable that
 * bg-card resolves to inside the room.
 */
export function roomCardHsl(hue: HueName): Record<ColorSchemeName, string> {
  const triples = roomTriples(hue);
  const toHsl = (triple: string) => `hsl(${triple.split(" ").join(", ")})`;
  return { light: toHsl(triples.light.card), dark: toHsl(triples.dark.card) };
}

/**
 * The full-bleed field gradient behind a module header, top → bottom stops.
 * Comma-form hsl() strings because LinearGradient cannot read CSS variables
 * (same escape hatch as hueHsl in src/features/mindfulness/exercise-hue.ts).
 */
export function fieldGradient(hue: HueName, isDark: boolean): [string, string] {
  const h = hueDegree(hue);
  const override = FIELD_STOP_OVERRIDES[hue]?.[isDark ? "dark" : "light"];
  if (override) {
    return override.map(([s, l]) => `hsl(${h}, ${s}%, ${l}%)`) as [string, string];
  }
  return isDark
    ? [`hsl(${h}, 34%, 20%)`, `hsl(${h}, 40%, 12%)`]
    : [`hsl(${h}, 50%, 42%)`, `hsl(${h}, 58%, 32%)`];
}
