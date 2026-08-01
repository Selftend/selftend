import { opaqueStyles } from "react-native-css-interop/dist/runtime/native/styles";

import type { HueName } from "@/src/lib/design-tokens";
import { roomTriples, roomVariables, type ColorSchemeName } from "@/src/lib/module-room";

// Why this file exists (#389). Every room suite used to assert its pour as
//
//   expect(root.props.style).toEqual(roomVariables("iris").light);
//
// which proves nothing. On the native runtime jest-expo uses, nativewind's
// `vars()` returns a literal `{}` and stashes the variables in a module-level
// WeakMap keyed by that object - so the style has no enumerable own keys, no
// own property names and no symbols. Every hue therefore deep-equals every
// other hue AND deep-equals `{}`, and the assertion stayed green when the
// wrong room was poured. It only ever proved that *some* style object reached
// the root.
//
// The fix is to read the variables back out of that WeakMap and compare the
// values the pour actually carries. That discriminates hues by real content -
// iris pours `--background: 280 32% 95%`, act pours `160 32% 95%` - so it also
// catches a `roomVariables` wiring bug, not just a wrong `useRoomStyle(hue)`
// argument. Identity (`toBe` against the cached pour object) would tell the
// hues apart too, but only because both sides go through the same cache; it
// would still pass if the cache handed out the wrong triples.
//
// Reaching into `react-native-css-interop/dist` is the price. It is contained
// to this one file, it is typed, and `pouredVariables` throws rather than
// returning an empty map if the internals ever move - so a nativewind upgrade
// breaks this loudly instead of quietly restoring the vacuum. The guard tests
// in test/room-pour.test.ts pin exactly that.

/**
 * The room pour style itself, for the rare test that has to render a room
 * *around* its subject rather than assert on a screen's own root. Prefer
 * `expectRoomPour` for assertions - this is a fixture, not a check.
 */
export function roomPour(hue: HueName, scheme: ColorSchemeName = "light") {
  return roomVariables(hue)[scheme];
}

/** The `--token: "h s% l%"` map a nativewind `vars()` style actually carries. */
export function pouredVariables(style: unknown): Record<string, string> {
  if (style === null || typeof style !== "object") {
    throw new Error(`Expected a room-pour style object, got ${typeof style}: ${String(style)}`);
  }
  if (Array.isArray(style)) {
    throw new Error(
      "Expected a bare room-pour style, got an array. A room root wears the pour " +
        "alone (`style={useRoomStyle(hue)}`); assert on the element that does.",
    );
  }

  // The web runtime's vars() returns the `--token` keys directly. Native
  // hides them; dig them out of the interop WeakMap.
  const own = Object.entries(style).filter(([name]) => name.startsWith("--"));
  if (own.length > 0) return Object.fromEntries(own.map(([n, v]) => [n, String(v)]));

  const ruleSet = opaqueStyles.get(style);
  if (!ruleSet) {
    throw new Error(
      "Style object carries no nativewind variables - it is not a room pour. " +
        "(If nativewind changed how vars() stores them, fix test/room-pour.ts.)",
    );
  }

  const entries = ("n" in ruleSet ? (ruleSet.n ?? []) : []).flatMap((rule) => rule.variables ?? []);
  if (entries.length === 0) {
    throw new Error(
      "Decoded a nativewind style but found no variables in it. " +
        "Fix test/room-pour.ts before trusting any room-pour assertion.",
    );
  }
  return Object.fromEntries(entries.map(([name, value]) => [name, String(value)]));
}

/**
 * True when a style carries no theme variables at all — the neutral room (#586).
 *
 * The inverse of `pouredVariables`, and it needs its own function rather than a
 * try/catch around that one: `pouredVariables` THROWS on a variable-less style
 * on purpose, because a silent empty map is exactly the #389 vacuum it exists to
 * prevent. Asserting "no pour" by catching that throw would pass just as
 * happily if nativewind's internals moved, which is the failure it was written
 * to make loud.
 */
export function carriesNoPour(style: unknown): boolean {
  if (style === null || typeof style !== "object" || Array.isArray(style)) return false;
  if (Object.keys(style).some((name) => name.startsWith("--"))) return false;

  const ruleSet = opaqueStyles.get(style);
  if (!ruleSet) return true;

  const entries = ("n" in ruleSet ? (ruleSet.n ?? []) : []).flatMap((rule) => rule.variables ?? []);
  return entries.length === 0;
}

/** The variables the room for `hue` is supposed to pour in `scheme`. */
export function expectedRoomVariables(
  hue: HueName,
  scheme: ColorSchemeName = "light",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(roomTriples(hue)[scheme]).map(([token, value]) => [`--${token}`, value]),
  );
}

type StyledElement = { props: { style?: unknown } };

/**
 * Assert that `element` wears NO room pour — the app's own surfaces, in the
 * active palette (#586).
 *
 * It replaces `expectRoomPour(element, hue)`, which asserted the opposite. The
 * rename is not cosmetic: a helper still called `expectRoomPour` while checking
 * for the absence of one is how a later contributor "restores" a room believing
 * they are fixing a test.
 *
 * The hue argument is gone rather than ignored, for the same reason — a call
 * that still names a hue reads as though the hue still means something here.
 */
export function expectNeutralRoom(element: StyledElement): void {
  const style = element.props.style;
  if (!carriesNoPour(style)) {
    expect(pouredVariables(style)).toEqual({});
  }
  expect(carriesNoPour(style)).toBe(true);
}
