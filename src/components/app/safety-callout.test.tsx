import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { CrisisSupportCallout } from "./safety-callout";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/act";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/modules/act";
});

/**
 * ⚠️ The component is `CrisisSupportCallout`; `safety-callout.tsx` is only the
 * file name, so a sweep grepping for `<SafetyCallout` finds nothing. It is the
 * loud destructive-red twin of `CrisisSupportBar`, and renders on the two module
 * homes that carry one - ACT's and DBT's.
 */
describe("CrisisSupportCallout", () => {
  it("opens the crisis page", () => {
    renderWithProviders(<CrisisSupportCallout />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(router.push).toHaveBeenCalledWith("/crisis");
  });

  /**
   * The same cross-hierarchy jump the bar makes (#1265, O3), from a module home
   * rather than from inside an exercise. `/crisis` is rooted at the top, so
   * without the Origin the way out of it lands on Home.
   *
   * On the store rather than on `router.push`: the helper pushes through
   * `router.push`, so the assertion above cannot tell a migrated call site from
   * an unmigrated one.
   */
  it("records the module home it left as the Origin for /crisis", () => {
    renderWithProviders(<CrisisSupportCallout />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/act",
      forPathname: "/crisis",
    });
  });
});
