import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { ConfirmDialog } from "./confirm-dialog";

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

/**
 * ⚠️ react-native's own `Modal` renders null in jest whenever `visible` is false,
 * which makes it impossible to tell "the component returned null" (the web fix)
 * from "a mounted Modal rendered nothing" (native, where the exit animation still
 * has to run). That is the exact distinction #1034 turns on, so the stock mock
 * would let a test pass against the bug.
 *
 * This stand-in keeps a marker in the tree whenever a Modal ELEMENT exists, and
 * renders the children only while it is open - the shape the real Modal has on
 * native. `modal-root` present therefore means "a Modal is mounted", not "a
 * dialog is showing".
 */
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible?: boolean }) => (
    <RN.View testID="modal-root">{visible ? children : null}</RN.View>
  );
  // ⚠️ A Proxy, not `{ ...RN }`. The react-native barrel exposes its components
  // as lazy getters; spreading it evaluates every one eagerly and dies in a
  // circular require (Button -> css-interop -> ActivityIndicator -> ...).
  return new Proxy(RN, {
    get: (target, prop, receiver) =>
      prop === "Modal" ? MockModal : Reflect.get(target, prop, receiver),
  });
});

const props = {
  isPending: false,
  title: "Delete this?",
  message: "This cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

function setPlatform(os: "web" | "ios") {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

afterEach(() => {
  setPlatform("ios");
  jest.clearAllMocks();
});

describe("ConfirmDialog", () => {
  it("renders its content when open", () => {
    setPlatform("web");
    render(<ConfirmDialog {...props} visible />);

    expect(screen.getByText("Delete this?")).toBeTruthy();
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();
  });

  /**
   * #1034. On web a closed dialog must leave NOTHING behind - not a hidden
   * subtree, not a Modal. react-native-web keeps a dismissed Modal mounted for
   * its 250ms fade-out, and while it lingers it is a full-viewport fixed layer
   * whose focus trap steals focus from whatever opens next; the habits overflow
   * menu reopened right after Archive was dismissing itself because of it.
   *
   * `modal-root` absent is the difference between "the Modal rendered nothing"
   * and "there is no Modal at all", which is the whole fix.
   */
  it("leaves no Modal mounted when closed on web", () => {
    setPlatform("web");
    const view = render(<ConfirmDialog {...props} visible={false} />);

    expect(screen.queryByTestId("modal-root")).toBeNull();
    expect(view.toJSON()).toBeNull();
  });

  /**
   * The web gate is deliberate, not incidental: native has no document, no focus
   * trap and no Radix popover, so it keeps the Modal - and its exit animation -
   * mounted. If this ever starts returning null, iOS and Android have silently
   * lost the fade-out to fix a bug neither platform has.
   */
  it("keeps the Modal mounted when closed on native, preserving the exit animation", () => {
    setPlatform("ios");
    render(<ConfirmDialog {...props} visible={false} />);

    expect(screen.queryByTestId("modal-root")).not.toBeNull();
  });

  it("does not open the dialog on native just because the Modal stays mounted", () => {
    setPlatform("ios");
    render(<ConfirmDialog {...props} visible={false} />);

    // The regression this guards: hardcoding `visible` on the Modal while the
    // web gate handles closing would leave every native dialog permanently open.
    expect(screen.queryByText("Delete this?")).toBeNull();
  });
});
