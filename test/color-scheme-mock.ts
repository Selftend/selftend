import { useThemeStore } from "@/src/stores/theme-store";

// Steering the colour scheme a room renders in.
//
// A screen that wears a module room resolves the scheme through the house
// reader, `useColorSchemeName` (src/lib/color-scheme.ts): the theme store's
// preference, falling back to the OS only when that preference is "system".
// Setting an explicit preference is therefore the whole job - no module needs
// mocking, and the read under test is the one the app really performs.
//
// This file used to mock nativewind's `useColorScheme` instead. That stopped
// steering anything when #344/#359 split the reader from its driver: nativewind
// became a downstream sink the driver *writes to*, not a source anything reads.
// The dark-pour assertions in the suites using it quietly rendered light, and
// the vacuous `toEqual(roomVariables(hue).dark)` form (#389) kept them green.
//
// Assert the result with `expectRoomPour` (test/room-pour.ts), which compares
// the variable values the pour actually carries - so a scheme that never moved
// fails loudly instead of passing on an empty object.
//
// Usage, in a suite that renders a room:
//
//   beforeEach(() => setScheme("light"));

/** Point the room's scheme read at `scheme` for the next render. */
export function setScheme(scheme: "light" | "dark") {
  // `hydrated: true` so the root driver's hydrate() cannot land afterwards and
  // clobber the choice - the race #358 fixed in the app, reproduced here.
  useThemeStore.setState({ preference: scheme, hydrated: true });
}
