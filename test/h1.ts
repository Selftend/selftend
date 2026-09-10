import { screen } from "@testing-library/react-native";

/**
 * The rendered H1's text, read from the tree (#2294).
 *
 * RNTL's `getByRole("heading")` takes no `level`, so the level is read off
 * the node: the `Text` h1 variant sets `aria-level="1"` (a string) and a
 * `CardTitle aria-level={1}` sets a number - both normalise to "1". Throws
 * when the tree has no H1 or more than one, so a screen with two competing
 * headings fails here rather than silently picking the first.
 */
export function h1Text(): string {
  const headings = screen
    .getAllByRole("heading")
    .filter((node) => String(node.props["aria-level"]) === "1");
  if (headings.length !== 1) {
    throw new Error(`Expected exactly one H1, found ${headings.length}`);
  }
  const children = headings[0].props.children as unknown;
  return Array.isArray(children) ? children.join("") : String(children);
}

/** Whether the tree has an H1 at all - for a state that renders no heading. */
export function hasH1(): boolean {
  return screen.queryAllByRole("heading").some((node) => String(node.props["aria-level"]) === "1");
}
