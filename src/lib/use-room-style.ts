import { vars } from "nativewind";

import { THEME_PALETTES } from "@/lib/theme";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import type { HueName } from "@/src/lib/design-tokens";
import type { roomVariables, ColorSchemeName } from "@/src/lib/module-room";
import { useStyleName } from "@/src/lib/style";

// Rooms are neutral (#586).
//
// A "room" re-poured every neutral surface on a module's screen as a low-chroma
// tint of that module's hue. It distinguished one module from another and
// nothing else - which is precisely the case #558 rules insufficient: hue
// survives only where colour carries information the user READS off it. Module
// identity is icon and label now.
//
// The neutral form of a room is not a neutral room, it is NO room: the app's own
// surfaces, which every screen already has. So this hook keeps its shape and
// stops pouring. That is deliberate, and it is why this batch is three files
// rather than thirty-four - the pour had exactly one definition, so neutralising
// it here changes every one of the 69 call sites atomically, with no chance of
// missing one and shipping a half-green screen.
//
// ⚠️ #589 closed without doing the deletion half, so the calls are still here and
// **#1292** owns removing them and this file with them. Until then, every remaining
// `useRoomStyle(hue)` is inert for EVERY hue: a screen that passes it and a screen
// that does not render identically. A `style={roomStyle}` prop is not evidence of a
// visual difference - an entire ticket's premise was this dead prop (#1378).

// One empty override set, shared: identity-stable, so a screen wearing it never
// invalidates a memoized subtree on re-render.
const NO_ROOM = vars({});

/**
 * Formerly the screen's room pour; now no overrides at all, so the screen keeps
 * the app's own surfaces in the active palette.
 *
 * The `hue` parameter is retained on purpose rather than removed here: dropping
 * it would touch all 69 call sites in a batch whose point is to change colour
 * and nothing else. #1292 deletes the calls.
 */
export function useRoomStyle(_hue: HueName): ReturnType<typeof roomVariables>[ColorSchemeName] {
  return NO_ROOM;
}

/**
 * The card surface a LinearGradient fade has to end on, as a comma-form hsl()
 * string - a gradient cannot read the CSS variable `bg-card` resolves to.
 *
 * With rooms gone this is simply the active palette's own card, which also
 * makes it the first version of this helper that follows the style axis: the
 * room pour it replaced was derived from a hue and would have stayed lilac-era
 * violet under every other palette.
 */
export function useRoomCardHsl(_hue: HueName): string {
  const style = useStyleName();
  const scheme = useColorSchemeName();
  const card = THEME_PALETTES[style][scheme].card;
  // `hsl(260 28% 99%)` -> `hsl(260, 28%, 99%)`: the comma form the gradient
  // consumers already expect.
  return card.replace(
    /hsl\(([^)]*)\)/,
    (_match, triple: string) => `hsl(${triple.split(/\s+/).join(", ")})`,
  );
}
