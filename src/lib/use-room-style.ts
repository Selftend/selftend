import { useColorScheme } from "nativewind";

import type { HueName } from "@/src/lib/design-tokens";
import { roomCardHsl, roomVariables, type ColorSchemeName } from "@/src/lib/module-room";

// The one sanctioned way for a screen to wear its module's room. The call
// sites used to hold `const X_ROOM = roomVariables("x")` at module scope —
// "static per-scheme styles, computed once". These hue-keyed caches keep that
// identity guarantee, now shared app-wide instead of duplicated per file.
// The cache lives here (not in module-room.ts) so the recipe module stays
// React-free — the node-side test/room-contrast.test.ts imports it.
//
// The scheme read below is nativewind's — the exact read the swept sites
// shipped, normalized once. See useRoomScheme for why it hasn't moved to the
// house reader yet.

const VARS = new Map<HueName, ReturnType<typeof roomVariables>>();
const CARD = new Map<HueName, ReturnType<typeof roomCardHsl>>();

/**
 * The scheme read the hue-derived recipes share — nativewind's reader,
 * normalized to the two names roomTriples and chipTriples key on. (A chip is
 * a one-swatch room, so the chip palette in
 * src/features/habits/habit-color.ts reads the scheme through here too.)
 *
 * Deliberately NOT named `useColorSchemeName` — spec #343 assigns that name to
 * the store-derived house reader in src/lib/color-scheme.ts, and #344 folds
 * this helper into it along with the 12 components still calling nativewind's
 * hook directly. Until that lands, this stays local so the two don't collide.
 */
export function useRoomScheme(): ColorSchemeName {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
}

/**
 * The current scheme's room pour for a module hue — apply to the screen
 * root: `style={useRoomStyle(hue)}`. Identity-stable per (hue, scheme), so
 * memoized subtrees aren't invalidated by parent re-renders.
 */
export function useRoomStyle(hue: HueName): ReturnType<typeof roomVariables>[ColorSchemeName] {
  const scheme = useRoomScheme();
  let vars = VARS.get(hue);
  if (!vars) {
    vars = roomVariables(hue);
    VARS.set(hue, vars);
  }
  return vars[scheme];
}

/**
 * The current scheme's room card surface as a comma-form hsl() string, for
 * native components (LinearGradient fades) that can't read the CSS variable
 * bg-card resolves to inside the room.
 */
export function useRoomCardHsl(hue: HueName): string {
  const scheme = useRoomScheme();
  let card = CARD.get(hue);
  if (!card) {
    card = roomCardHsl(hue);
    CARD.set(hue, card);
  }
  return card[scheme];
}
