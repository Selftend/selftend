import { useWindowDimensions } from "react-native";

/**
 * The one width the settings surfaces branch on.
 *
 * Extracted from `settings-colophon.tsx`, which owned it privately, so the type
 * scale (#1830) and the colophon's stacking read the same number from the same
 * place. **Two separate width branches on one page is the drift this map keeps
 * closing** — a second `>= 640` written by hand is how the page ends up with a
 * stepped-down row beside a full-size one at some width nobody tested.
 *
 * ⚠️ Deliberately scoped to the settings surfaces. Five other screens inline
 * their own `windowWidth >= 640` (gratitude, grounding ×2, mood ×2); sweeping
 * those is a separate change and none of them is on this page.
 */
export const WIDE_WIDTH = 640;

/** `true` on the desktop frame, `false` on the phone step-down. */
export function useWideFrame(): boolean {
  const { width } = useWindowDimensions();

  return width >= WIDE_WIDTH;
}
