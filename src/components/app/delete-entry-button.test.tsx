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
});
