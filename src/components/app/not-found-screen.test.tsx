import { fireEvent, screen } from "@testing-library/react-native";

import NotFoundScreen from "./not-found-screen";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/definitely-not-a-route";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  usePathname: () => mockPathname,
}));

const { router } = jest.requireMock("expo-router") as {
  router: { replace: jest.Mock };
};

describe("NotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/definitely-not-a-route";
  });

  it("says the page was not found", () => {
    renderWithProviders(<NotFoundScreen />);

    expect(screen.getByText("Page not found")).toBeTruthy();
  });

  // W13 (#1255): the way out reaches this screen through chrome, so the
  // coverage gate can assert chrome only (G4) instead of widening to "chrome
  // or some link home".
  it("renders exactly one Escape, through chrome", () => {
    renderWithProviders(<NotFoundScreen />);

    expect(screen.getByTestId("screen-top-bar")).toBeTruthy();
    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
  });

  it("escapes Home from a wholly unknown path, and says so", () => {
    renderWithProviders(<NotFoundScreen />);

    // One crumb, so the trail hides and the hop is the root.
    fireEvent.press(screen.getByLabelText("Back to Home"));

    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("escapes to the deepest real ancestor of the attempted path", () => {
    mockPathname = "/tools/definitely-not-a-tool";
    renderWithProviders(<NotFoundScreen />);

    // `/tools` exists and the trail can name it, so the Escape offers it
    // rather than discarding the user's place with a jump to Home.
    fireEvent.press(screen.getByLabelText("Back to Tools"));

    expect(router.replace).toHaveBeenCalledWith("/tools");
  });

  // The AC is "replaced, not kept alongside" (R1 - two exits are two
  // promises). Asserted by the old link's TEXT, not a testID: the link never
  // had one, and text is what would come back if someone re-added it.
  it("keeps no bare link home alongside the Escape", () => {
    renderWithProviders(<NotFoundScreen />);

    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
