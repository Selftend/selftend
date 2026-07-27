import { renderHook } from "@testing-library/react-native";

import type { HueName } from "@/src/lib/design-tokens";
import { useRoomStyle } from "@/src/lib/use-room-style";

/**
 * The current scheme's room pour for a hue, exactly as a screen receives it —
 * for asserting `expect(root.props.style).toBe(roomPour("iris"))`.
 *
 * Comparing against `roomVariables(hue)[scheme]` with `toEqual` reads like a
 * positive assertion but isn't: nativewind's `vars()` returns an object with
 * no enumerable own keys under jest, so every hue deep-equals every other hue
 * (and `{}`). Such a test only proves *some* style reached the root — it stays
 * green when the wrong room is poured. `useRoomStyle` caches one object per
 * (hue, scheme), so identity against that cache does tell the hues apart.
 *
 * The 27 sibling assertions still on the `toEqual` form — including the
 * per-hue coverage in src/lib/use-room-style.test.ts — are tracked by #389.
 * New room work should reach for this helper, not copy the old idiom.
 */
export function roomPour(hue: HueName) {
  // Unmounted before returning: the hook subscribes to the theme store that the
  // house reader resolves against, and a suite that moves the scheme between
  // pours would otherwise re-render this stray tree outside act().
  const { result, unmount } = renderHook(() => useRoomStyle(hue));
  const style = result.current;
  unmount();
  return style;
}
