import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { DeleteEntryButton } from "./delete-entry-button";
import { renderWithProviders } from "@/test/render-with-providers";

describe("DeleteEntryButton", () => {
  it("only calls onConfirm after the dialog is confirmed", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <DeleteEntryButton
        label="Delete"
        title="Delete this?"
        message="Cannot be undone."
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByText("Delete"));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  /**
   * ☠️ A rejected `onConfirm` means "it failed, stay open", and swallowing it here is what
   * makes the `error` slot reachable at all (#1335). Before this, a failing delete escaped
   * as an unhandled rejection, so the only way to report it was a toast - and on Android a
   * toast cannot rise above the native modal this dialog is.
   */
  it("keeps the confirmation open when the delete fails, and shows the caller's reason", async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error("network"));
    renderWithProviders(
      <DeleteEntryButton
        label="Delete"
        title="Delete this?"
        message="Cannot be undone."
        error="Couldn't delete that."
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByText("Delete"));
    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    // Still open, with the reason in it, rather than closed over a silent failure.
    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();
    const reason = screen.getByText("Couldn't delete that.");
    // It replaces a toast, which announced itself.
    expect(reason.props.role).toBe("alert");
  });

  /** Only this component knows the dialog is reopening, so only it can say so. */
  it("tells the caller when the confirmation opens, so a stale error can be cleared", () => {
    const onOpen = jest.fn();
    renderWithProviders(
      <DeleteEntryButton
        label="Delete"
        title="Delete this?"
        message="Cannot be undone."
        onOpen={onOpen}
        onConfirm={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Delete"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
