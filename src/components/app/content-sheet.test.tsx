import { render, screen } from "@testing-library/react-native";

import { CONTENT_SHEET_OVERLAP, ContentSheet } from "@/src/components/app/content-sheet";

describe("ContentSheet", () => {
  it("covers the full field overlap when used as an empty sheet lip", () => {
    render(<ContentSheet testID="content-sheet" />);

    expect(screen.getByTestId("content-sheet").props.className).toContain(
      `min-h-[${CONTENT_SHEET_OVERLAP}px]`,
    );
  });
});
