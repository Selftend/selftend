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
// nativewind's useColorScheme is the *reader*; useAppColorScheme is the
// *driver* (hydrates the theme store and pushes into nativewind) and must
// stay root-scoped. This is the exact read the swept sites shipped,
// normalized once.

const VARS = new Map<HueName, ReturnType<typeof roomVariables>>();
const CARD = new Map<HueName, ReturnType<typeof roomCardHsl>>();

/**
 * The scheme read every hue-derived style shares — nativewind's reader,
 * normalized to the two names the recipe modules key on.
 */
export function useColorSchemeName(): ColorSchemeName {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
}

/**
 * The current scheme's room pour for a module hue — apply to the screen
 * root: `style={useRoomStyle(hue)}`. Identity-stable per (hue, scheme), so
 * memoized subtrees aren't invalidated by parent re-renders.
 */
export function useRoomStyle(hue: HueName): ReturnType<typeof roomVariables>[ColorSchemeName] {
  const scheme = useColorSchemeName();
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
  const scheme = useColorSchemeName();
  let card = CARD.get(hue);
  if (!card) {
    card = roomCardHsl(hue);
    CARD.set(hue, card);
  }
  return card[scheme];
}
