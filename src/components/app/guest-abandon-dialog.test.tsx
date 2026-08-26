import { fireEvent, render, screen } from "@testing-library/react-native";

import "@/src/i18n";
import { GuestAbandonDialog } from "./guest-abandon-dialog";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

// Marker Modal: the stock jest Modal cannot distinguish "returned null" (the
// web gate) from "mounted but closed" (native) — the distinction #1034 turns
// on. See the helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

const mockExportData = jest.fn<Promise<boolean>, []>();
let mockExportPending = false;

jest.mock("@/src/features/settings/use-export-data", () => ({
  useExportData: () => ({ exportData: mockExportData, isPending: mockExportPending }),
}));

const props = {
  isPending: false,
  confirmLabel: "Sign in anyway",
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

afterEach(() => {
  setPlatformOS("ios");
  mockExportPending = false;
  jest.clearAllMocks();
});

describe("GuestAbandonDialog", () => {
  it("renders the calm warning with export, cancel and confirm when open", () => {
    setPlatformOS("web");
    render(<GuestAbandonDialog {...props} visible />);

    expect(screen.getByText("Your guest data stays behind")).toBeTruthy();
    expect(screen.getByText("Export your data first")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Sign in anyway")).toBeTruthy();
  });

  it("fires the caller's actions from confirm and cancel", () => {
    setPlatformOS("web");
    render(<GuestAbandonDialog {...props} visible />);

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    expect(props.onConfirm).toHaveBeenCalled();
    fireEvent.press(screen.getByText("Cancel"));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it("runs the existing export in place and confirms delivery inline", async () => {
    // Inline rather than by toast alone: the toast layer renders under this
    // Modal, so a person keeping the dialog open would never see it.
    setPlatformOS("web");
    mockExportData.mockResolvedValue(true);
    render(<GuestAbandonDialog {...props} visible />);

    fireEvent.press(screen.getByTestId("guest-abandon-export"));

    expect(await screen.findByText("Your export is saved.")).toBeTruthy();
    expect(mockExportData).toHaveBeenCalled();
    // Export never proceeds or closes anything - it is an aside, not an answer.
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("shows no delivery line when the export failed (its own toast reports that)", async () => {
    setPlatformOS("web");
    mockExportData.mockResolvedValue(false);
    render(<GuestAbandonDialog {...props} visible />);

    fireEvent.press(screen.getByTestId("guest-abandon-export"));

    await screen.findByTestId("guest-abandon-export");
    expect(screen.queryByText("Your export is saved.")).toBeNull();
  });

  it("disables every action while the confirmed sign-in is in flight", () => {
    setPlatformOS("web");
    render(<GuestAbandonDialog {...props} visible isPending />);

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    fireEvent.press(screen.getByText("Cancel"));
    fireEvent.press(screen.getByTestId("guest-abandon-export"));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
    expect(mockExportData).not.toHaveBeenCalled();
  });

  /** #1054: on web a closed dialog must leave NOTHING mounted - see confirm-dialog. */
  it("leaves no Modal mounted when closed on web", () => {
    setPlatformOS("web");
    const view = render(<GuestAbandonDialog {...props} visible={false} />);

    expect(screen.queryByTestId("modal-root")).toBeNull();
    expect(view.toJSON()).toBeNull();
  });

  it("keeps the Modal mounted when closed on native, preserving the exit animation", () => {
    setPlatformOS("ios");
    render(<GuestAbandonDialog {...props} visible={false} />);

    expect(screen.queryByTestId("modal-root")).not.toBeNull();
    expect(screen.queryByText("Your guest data stays behind")).toBeNull();
  });
});
