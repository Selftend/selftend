import type { ReactTestInstance } from "react-test-renderer";

/**
 * What react-native hangs on a host node that a pointer or a keyboard can reach — probed
 * off a real `Pressable`'s rendered root, which carries all three.
 *
 * ☠️ **The list is why a reservation is tested at all.** `ReservedSpace` hides its
 * measuring stick from the eye, the screen reader and the pointer, and none of that
 * reaches the Tab key: react-native-web gives every `Pressable` `tabIndex="0"` unless it is
 * disabled, so an interactive stick stays focusable while invisible, inside `aria-hidden`.
 * A reservation may therefore hold no reachable element, and each one has to prove it.
 *
 * Named here once rather than per test file: a rename in react-native would otherwise have
 * to be found in every reservation's suite separately, and the half that would quietly
 * stop testing anything is the absence half.
 */
export const INTERACTIVE_PROPS = ["focusable", "onClick", "onStartShouldSetResponder"] as const;

/**
 * Every host node in `root` that carries one of {@link INTERACTIVE_PROPS}.
 *
 * ⚠️ Assert against a render that is known to contain one before trusting an empty result:
 * `queryAllByRole("link", { includeHiddenElements: true })` returns `[]` even with a real
 * role-carrying `Pressable` planted inside a hidden stick, so an absence-only assertion
 * there proves nothing at all.
 */
export function interactiveNodes(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll(
    (node) =>
      typeof node.type === "string" &&
      INTERACTIVE_PROPS.some((prop) => node.props[prop] !== undefined),
    { deep: true },
  );
}
