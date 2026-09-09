import { screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import LegalScreen from "../../../app/(app)/legal";
import { HOME_COLUMN } from "@/src/lib/layout";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/legal",
}));

describe("LegalScreen", () => {
  /**
   * #1721: `/legal` ran edge-to-edge on a wide browser while Settings and
   * Notifications sat in a 672px column. The column is `HOME_COLUMN` on the
   * PADDED scroll box, the way `/support` applies it - 720 outer minus the
   * `p-6` gutters is the 672 the siblings show. Jest does not run NativeWind's
   * compiler, so the class prop is asserted as tokens (className never becomes
   * style here); the padding is pinned on the SAME element because a column
   * placed inside the gutters would read 720, not 672.
   */
  it("takes the 672px content column of Settings and Notifications (#1721)", () => {
    renderWithProviders(<LegalScreen />);

    const tokens = String(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerClassName,
    ).split(/\s+/);

    for (const token of HOME_COLUMN.split(/\s+/)) {
      expect(tokens).toContain(token);
    }
    expect(tokens).toContain("p-6");
  });
});
