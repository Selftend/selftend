import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ShowAllLink } from "./show-all-link";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";

/** The screen the door is pressed FROM — what the Origin should record. */
let mockPathname = "/tools/gratitude-log";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

const mockRouter = router as jest.Mocked<typeof router>;

describe("ShowAllLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/tools/gratitude-log";
  });

  it("renders the label it is given", () => {
    render(<ShowAllLink label="Show all records" route="/modules/cbt/saved" />);

    expect(screen.getByText("Show all records")).toBeTruthy();
  });

  /**
   * The arrow is an icon, never part of the string - so it must not reach the
   * accessible name. A door reading "Show all records arrow-forward" is the defect
   * the two arrow-baked strings would have caused the moment they came through here
   * (#1375).
   */
  it("takes its accessible name from the label alone, leaving the arrow out of it", () => {
    render(<ShowAllLink label="Show all records" route="/modules/cbt/saved" />);

    expect(screen.getByRole("link", { name: "Show all records" })).toBeTruthy();
  });

  it("navigates to the route it is given", () => {
    render(<ShowAllLink label="Show all logs" route="/modules/act/defusion" />);

    fireEvent.press(screen.getByRole("link", { name: "Show all logs" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/modules/act/defusion");
  });

  /**
   * ⚠️ Through `usePushWithOrigin`, not a bare `router.push`.
   *
   * The two per-module copies this component replaced - check-in's and sleep's -
   * had ALREADY been migrated to the Origin helper on `dev` (#1267) by the time
   * this branch merged, so deleting them in favour of a bare push would have
   * silently taken the way back off eight doors at once: every one is a
   * cross-hierarchy arrival, which is precisely where an Origin-less push leaves
   * the destination showing "Up" instead of where the user came from.
   *
   * `eslint.config.js` bans the bare call and `test/bare-router-push-ban.test.ts`
   * keeps its exemption list honest, but neither can see that the RECORDED origin
   * is the screen the door was pressed from. That is what this asserts.
   */
  it("records where the door was pressed from, so the arrival can offer the way back", () => {
    mockPathname = "/tools/sleep";
    render(<ShowAllLink label="Show all nights" route="/tools/sleep/history" />);

    fireEvent.press(screen.getByRole("link", { name: "Show all nights" }));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/tools/sleep",
      forPathname: "/tools/sleep/history",
    });
  });
});
