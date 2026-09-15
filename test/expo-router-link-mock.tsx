import React from "react";

/**
 * A stand-in for expo-router's `Link` in suites that mock the module by hand.
 *
 * Mirrors `Link asChild`: the `href` is forwarded onto the one wrapped child, so
 * a test can read the real link target off the pressable
 * (`getByRole("link", { name }).props.href`) instead of spying on `router.push`.
 * The child's own `onPress` stays in place, which is what the real component
 * does too - `BaseExpoRouterLink` calls it before navigating - so a press in a
 * test reaches whatever the anchor records on the way out.
 *
 * ☠️ Why this exists as a file: since #2467 every public page renders the site
 * footer, and the footer is made of `LinkButton`s. A suite that mocks
 * `expo-router` as `{ router, usePathname }` alone - the shape every policy
 * suite had - then renders `undefined` where `Link` should be and fails on an
 * element-type error that has nothing to do with what it asserts. Each such
 * suite adds `Link: require("@/test/expo-router-link-mock").MockLink` to its
 * factory rather than pasting the mirror a ninth time.
 */
export function MockLink({
  href,
  asChild: _asChild,
  children,
}: {
  href: string;
  asChild?: boolean;
  dangerouslySingular?: unknown;
  children: React.ReactElement<{ href?: string }>;
}) {
  return React.cloneElement(React.Children.only(children), { href });
}
