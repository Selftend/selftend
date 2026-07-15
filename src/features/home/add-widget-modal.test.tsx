import { screen } from "@testing-library/react-native";

import {
  AddWidgetModal,
  CATEGORY_ICON,
  CATEGORY_ORDER,
} from "@/src/features/home/add-widget-modal";
import { renderWithProviders } from "@/test/render-with-providers";

describe("AddWidgetModal categories", () => {
  it("includes a routines category in the ordering, with an icon", () => {
    expect(CATEGORY_ORDER).toContain("routines");
    expect(CATEGORY_ICON.routines).toBeDefined();
    // Routines builds on the tools, so its category comes after them.
    expect(CATEGORY_ORDER.indexOf("routines")).toBeGreaterThan(CATEGORY_ORDER.indexOf("habits"));
  });

  it("renders the Routines category row in the Tools section", () => {
    renderWithProviders(
      <AddWidgetModal
        visible
        onClose={jest.fn()}
        existingWidgetIds={[]}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText("Routines")).toBeTruthy();
  });
});
