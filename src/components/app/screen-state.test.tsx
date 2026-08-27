import { screen } from "@testing-library/react-native";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenLoading,
  ScreenNotFound,
} from "./screen-state";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  usePathname: () => "/tools/check-in/new",
}));

/**
 * The runtime half of #1328. `test/escape-coverage.test.ts` proves from source
 * that every render path REACHES the chrome; these prove the two shells it
 * reaches actually put an Escape on the glass, and - just as load-bearing -
 * that the bodies do not carry one of their own.
 */
describe("whole-screen states", () => {
  it("gives a loading screen a way out", () => {
    // The branch this exists for: a screen that renders its header only on the
    // happy path leaves the user holding a spinner and nothing to press.
    renderWithProviders(<ScreenLoading title="Loading" />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getByText("Loading")).toBeTruthy();
  });

  it("gives a not-found screen a way out", () => {
    // The one a user is most likely to need it on: nothing else is on the page.
    renderWithProviders(<ScreenNotFound title="Habit not found" />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getByText("Habit not found")).toBeTruthy();
  });

  it("renders exactly one Escape, never a second beside it", () => {
    // R1: two exits are two promises. The shell owns the only one.
    renderWithProviders(<ScreenLoading description="Just a moment" title="Loading" />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getByText("Just a moment")).toBeTruthy();
  });
});

describe("the bodies, which are dropped into a screen that already has chrome", () => {
  // ☠️ These three must NOT carry chrome. They render inside a screen whose
  // header is already mounted above them, so an Escape here would be the second
  // one on the page. That is why the whole-screen shells above exist as
  // separate components rather than these growing a bar of their own.
  it.each([
    ["LoadingState", <LoadingState key="l" title="Loading" />],
    ["ErrorState", <ErrorState key="e" title="Could not load" />],
    ["EmptyState", <EmptyState key="m" title="Nothing here yet" />],
  ])("%s renders no Escape of its own", (_name, element) => {
    renderWithProviders(element);

    expect(screen.queryByTestId("screen-escape")).toBeNull();
  });
});
