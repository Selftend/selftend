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

import {
  HUE_INK_TRIPLES,
  HUE_TRIPLES,
  PRIMARY_TRIPLES,
  type HueName,
} from "@/src/lib/design-tokens";

export type ColorSchemeName = "light" | "dark";

/** The leading hue degree of a module hue, e.g. "be" → 330. */
export function hueDegree(hue: HueName): number {
  return Number.parseInt(HUE_TRIPLES[hue].light, 10);
}

// The accent ink a room pours (#368) is the hue's ink from the token source,
// not a second recipe: `text-think` on the think room's background is 1.90:1,
// well under half of AA's 4.5, and the fix — same hue and saturation, fixed
// lightness — is the same one the room-less `text-<hue>-ink` needs (#403).
// HUE_INK_TRIPLES holds it once, so the two cannot drift apart; why 28%, and
// why dark keeps the published accent, are documented there. Room-surface
// floors are enforced by test/room-contrast.test.ts.

/**
 * Space-separated HSL triples for the surface tokens a room re-pours,
 * keyed by CSS variable name (without the leading `--`).
 *
 * `accent-ink` is the odd one out: it is not a surface but the room hue itself,
 * darkened until it can carry small text on the surfaces above
 * (`text-accent-ink` — see HUE_INK_TRIPLES). Do not read it as ink on `accent`;
 * that pairing is `accent-foreground`.
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
      "accent-ink": HUE_INK_TRIPLES[hue].light,
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
      "accent-ink": HUE_INK_TRIPLES[hue].dark,
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
 * A hue a field header can be poured from: any module hue, or the app's
 * primary violet. `"primary"` exists for the CBT home (#500, owner decision):
 * its field matches the sidebar's CBT accent, and since the app's default
 * surfaces are already the violet family, the screen wears no room at all -
 * the default theme IS the violet room in practice.
 */
export type FieldHue = HueName | "primary";

/**
 * The full-bleed field gradient behind a module header, top → bottom stops.
 * Comma-form hsl() strings because LinearGradient cannot read CSS variables
 * (same escape hatch as hueHsl in src/features/mindfulness/exercise-hue.ts).
 */
export function fieldGradient(hue: FieldHue, isDark: boolean): [string, string] {
  const h = hue === "primary" ? Number.parseInt(PRIMARY_TRIPLES.light, 10) : hueDegree(hue);
  if (hue === "primary") {
    // The standard formula, like iris (violet's neighbour) - no override
    // needed; test/room-contrast.test.ts holds the primary field to the same
    // AA floors as every hue field.
    return isDark
      ? [`hsl(${h}, 34%, 20%)`, `hsl(${h}, 40%, 12%)`]
      : [`hsl(${h}, 50%, 42%)`, `hsl(${h}, 58%, 32%)`];
  }
  const override = FIELD_STOP_OVERRIDES[hue]?.[isDark ? "dark" : "light"];
  if (override) {
    return override.map(([s, l]) => `hsl(${h}, ${s}%, ${l}%)`) as [string, string];
  }
  return isDark
    ? [`hsl(${h}, 34%, 20%)`, `hsl(${h}, 40%, 12%)`]
    : [`hsl(${h}, 50%, 42%)`, `hsl(${h}, 58%, 32%)`];
}
