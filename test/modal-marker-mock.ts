import type { ReactNode } from "react";

/**
 * ⚠️ react-native's own `Modal` renders null in jest whenever `visible` is
 * false, which makes it impossible to tell "the component returned null" (the
 * web unmount gate, #1034 → #1054) from "a mounted Modal rendered nothing"
 * (native, where the exit animation still has to run). That is the exact
 * distinction the gate turns on, so the stock behavior would let a test pass
 * against the bug.
 *
 * This stand-in keeps a marker in the tree whenever a Modal ELEMENT exists,
 * and renders the children only while it is open — the shape the real Modal
 * has on native. `modal-root` present therefore means "a Modal is mounted",
 * not "a dialog is showing".
 *
 * Use from the top of a test file (the factory may only `require`, never
 * close over imports):
 *
 *   jest.mock("react-native", () =>
 *     require("@/test/modal-marker-mock").reactNativeWithModalMarker(),
 *   );
 */
export function reactNativeWithModalMarker() {
  // Lazy require, deliberately: this function runs inside a hoisted jest.mock
  // factory, before this module's own top-level imports would be safe.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const RN = jest.requireActual("react-native");
  const MockModal = ({ children, visible }: { children?: ReactNode; visible?: boolean }) =>
    React.createElement(RN.View, { testID: "modal-root" }, visible ? children : null);
  // ⚠️ A Proxy, not `{ ...RN }`. The react-native barrel exposes its components
  // as lazy getters; spreading it evaluates every one eagerly and dies in a
  // circular require (Button -> css-interop -> ActivityIndicator -> ...).
  return new Proxy(RN, {
    get: (target, prop, receiver) =>
      prop === "Modal" ? MockModal : Reflect.get(target, prop, receiver),
  });
}

/** Point `Platform.OS` at another platform for the current test. */
export function setPlatformOS(os: "web" | "ios" | "android") {
  // Resolved lazily: a top-level react-native import here would re-enter the
  // very mock this module's factory builds, mid-initialization.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require("react-native") as typeof import("react-native");
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}
