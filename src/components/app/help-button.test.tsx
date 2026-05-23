import { fireEvent, screen } from "@testing-library/react-native";

import { HelpButton } from "./help-button";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HelpButton", () => {
  it("opens the help sheet on press and shows the content", () => {
    renderWithProviders(<HelpButton helpKey="worry" />);
    expect(screen.queryByText("Worry time")).toBeNull();
    fireEvent.press(screen.getByLabelText("Help: Worry time"));
    expect(screen.getByText("Worry time")).toBeTruthy();
  });
});
