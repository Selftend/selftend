import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ShowAllLink } from "./show-all-link";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = router as jest.Mocked<typeof router>;

describe("ShowAllLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
