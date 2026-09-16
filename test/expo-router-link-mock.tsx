import React from "react";
import { screen } from "@testing-library/react-native";

/**
 * A stand-in for expo-router's `Link` under `asChild`, for a `jest.mock`
 * factory: `Link: require("@/test/expo-router-link-mock").MockLink`.
 *
 * It forwards the `href` onto the wrapped pressable - which is what the real
 * Link does through radix's Slot - so a test can assert a real link target by
 * role and name (`linkHref` below) instead of spying on `router.push`. The
 * child's own `onPress` is left in place, as the Slot leaves it, so a handler
 * beside the href (an Origin record, #2476) still fires under `fireEvent.press`.
 *
 * Navigation itself is NOT simulated. That is the point of asserting on the
 * href: a press must reach the router through nothing else, so a screen that
 * still pushed for itself would show up as a `router.push` call.
 *
 * ⚠️ `dangerouslySingular` is dropped here. `sidebar-nav.test.tsx` keeps its own
 * variant because that flag is half of what a panel link IS (#989); a test that
 * asserts on it must not switch to this mock.
 */
export function MockLink({
  href,
  asChild: _asChild,
  children,
}: {
  href: string;
  asChild?: boolean;
  children: React.ReactElement<{ href?: string }>;
}) {
  return React.cloneElement(React.Children.only(children), { href });
}

/** The `href` the link named `name` carries, through `MockLink`. */
export function linkHref(name: string) {
  return screen.getByRole("link", { name }).props.href as string;
}
