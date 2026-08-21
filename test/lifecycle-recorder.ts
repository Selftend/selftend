import { createElement, useEffect, type ComponentType } from "react";

/**
 * Mount and unmount of whatever is under record, in order. One shared log rather
 * than one per recorder: a test that needs to tell two components apart should
 * assert on a tree, not on a counter.
 *
 * Reset it in `beforeEach`, not `afterEach` - RNTL's auto-cleanup unmounts the
 * tree in an afterEach of its own, and an ordering assumption between the two
 * decides whether a trailing "unmount" leaks into the next test.
 */
export const lifecycleLog: string[] = [];

/**
 * Wraps a component so its OWN mount and unmount become observable, while still
 * rendering the real one underneath - so assertions about what it hands the
 * platform stay assertions about the real thing, not about a stand-in.
 *
 * ☠️ This lives in its own module for a mechanical reason, not a stylistic one.
 * `babel-preset-expo` runs with `react-compiler` and `jsxImportSource:
 * "nativewind"`, both of which rewrite a component to reference a module-scope
 * import (`_ReactNativeCSSInterop`). A component declared INSIDE a `jest.mock()`
 * factory therefore trips jest's out-of-scope-variable guard and the suite dies
 * before a single test runs. Declared here, the factory only has to `require` it.
 */
export function recordLifecycleOf<Props extends object>(
  Real: ComponentType<Props>,
): ComponentType<Props> {
  return function LifecycleRecorder(props: Props) {
    useEffect(() => {
      lifecycleLog.push("mount");
      return () => {
        lifecycleLog.push("unmount");
      };
    }, []);

    return createElement(Real, props);
  };
}
