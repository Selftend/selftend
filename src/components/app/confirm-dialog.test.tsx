import { render, screen } from "@testing-library/react-native";

import { ConfirmDialog } from "./confirm-dialog";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

// Marker Modal: the stock jest Modal cannot distinguish "returned null" (the
// web fix) from "mounted but closed" (native) — the exact distinction #1034
// turns on. See the helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

const props = {
  isPending: false,
  title: "Delete this?",
  message: "This cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

afterEach(() => {
  setPlatformOS("ios");
  jest.clearAllMocks();
});

describe("ConfirmDialog", () => {
  it("renders its content when open", () => {
    setPlatformOS("web");
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
    setPlatformOS("web");
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
    setPlatformOS("ios");
    render(<ConfirmDialog {...props} visible={false} />);

    expect(screen.queryByTestId("modal-root")).not.toBeNull();
  });

  it("does not open the dialog on native just because the Modal stays mounted", () => {
    setPlatformOS("ios");
    render(<ConfirmDialog {...props} visible={false} />);

    // The regression this guards: hardcoding `visible` on the Modal while the
    // web gate handles closing would leave every native dialog permanently open.
    expect(screen.queryByText("Delete this?")).toBeNull();
  });
});
