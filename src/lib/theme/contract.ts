// The style contract (#579, resolved on #559): the exhaustive set of CSS
// variables one theme style fills for one appearance scheme.
//
// TypeScript is the single source of truth. global.css carries a static copy of
// the DEFAULT_STYLE pair and nothing else — its only job is the pre-hydration
// first paint — and test/theme-contract.test.ts fails the build if the two
// drift. This inverts the old duality, where global.css was hand-written and
// src/lib/design-tokens.ts mirrored it: with a style axis that mirror would be
// sixteen hand-written blocks, which is not seriously on the table.
//
// Three things deliberately sit OUTSIDE this list:
//
//   --radius      A global constant (RADIUS below), not a style token. The
//                 owner ruled the style axis colours-only: radius, fonts,
//                 spacing and control shapes never vary by style.
//
//   --accent-ink  The room-poured hue ink: src/lib/module-room.ts re-pours it
//                 per hue, and outside a room it falls back to the app accent —
//                 the silent-violet trap #403 spent a sweep on. Once rooms go
//                 neutral (#558) nothing pours it and it collapses onto
//                 --primary-ink, a second name for one value, so it gets no home
//                 here. lib/theme.ts keeps emitting today's fallback until the
//                 call-site sweep (#585-#588) retires the last consumer and #589
//                 deletes the var for real.
//
//   the 8 hues    Not theme tokens. They survive as a pinned encoding palette
//   and hue inks  (src/lib/design-tokens.ts) for the surfaces where colour
//                 carries information the user reads off it — the mood ramp,
//                 habit colours, the breathing pacer. Keeping them out of the
//                 contract is what makes eight styles affordable: 20 names, not
//                 20 + 16 x 8.

/** The 20 names a style fills, per scheme. Order is the authoring order. */
export const THEME_VAR_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--primary-ink",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
] as const;

export type ThemeVarName = (typeof THEME_VAR_NAMES)[number];

/**
 * One style, one scheme: every contract name mapped to a space-separated HSL
 * triple ("262 62% 56%"), the form tailwind.config.js reads via hsl(var(--…)).
 */
export type ThemeTokens = Record<ThemeVarName, string>;

export type ColorScheme = "light" | "dark";

export const COLOR_SCHEMES = ["light", "dark"] as const;

/**
 * Corner radius, app-wide and style-independent (#555 §2). It is still emitted
 * as `--radius` — every `rounded-*` class resolves through it — but it is one
 * constant rather than a per-style token, so no palette can reshape the app's
 * controls. WikiCanvas ships radius per style; we deliberately do not.
 */
export const RADIUS = "0.625rem";
