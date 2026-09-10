import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Reads what a component hands to `expo-router/head` (#2293).
 *
 * Helmet is never under test; what reaches it is. A test file mocks the
 * module once, pushing every `<Head>` render's children into a shared list:
 *
 * ```ts
 * jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());
 * ```
 *
 * and then reads the tags back as plain `{ type, props }` records. `reset()`
 * belongs in `beforeEach`.
 */

export type HeadTag = { type: string; props: Record<string, unknown> };

const captured: ReactNode[] = [];

/** The `expo-router/head` module replacement: a default export that records. */
export function headMock() {
  return {
    __esModule: true,
    default: ({ children }: { children: ReactNode }) => {
      captured.push(children);
      return null;
    },
  };
}

export function reset(): void {
  captured.length = 0;
}

/** Every DOM-typed element handed to `<Head>` so far, in render order. */
export function tags(): HeadTag[] {
  return Children.toArray(captured.flat())
    .filter((node): node is ReactElement<Record<string, unknown>> => isValidElement(node))
    .filter((node) => typeof node.type === "string")
    .map((node) => ({ type: node.type as string, props: node.props }));
}

/** The `<meta>` tags whose `name` or `property` is `named`. */
export function meta(named: string): HeadTag[] {
  return tags().filter(
    ({ type, props }) => type === "meta" && (props.name === named || props.property === named),
  );
}

/** Whether any `<Head>` has rendered at all since the last `reset()`. */
export function rendered(): boolean {
  return captured.length > 0;
}
