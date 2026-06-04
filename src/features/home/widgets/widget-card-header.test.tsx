import { screen } from "@testing-library/react-native";

import { WidgetCardHeader } from "@/src/features/home/widgets/widget-card-header";
import { renderWithProviders } from "@/test/render-with-providers";

describe("WidgetCardHeader", () => {
  it("renders the title and the module badge label", () => {
    renderWithProviders(
      <WidgetCardHeader icon="explore" title="Your values" moduleLabel="ACT" tint="act" />,
    );

    expect(screen.getByText("Your values")).toBeTruthy();
    expect(screen.getByText("ACT")).toBeTruthy();
  });
});
