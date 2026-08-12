import { fireEvent, screen } from "@testing-library/react-native";

import { ScreenTopBar } from "./screen-top-bar";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  usePathname: () => "/tools/check-in/new",
}));

const { router } = jest.requireMock("expo-router") as { router: { replace: jest.Mock } };

describe("ScreenTopBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the uppercase trail for the current screen", () => {
    renderWithProviders(<ScreenTopBar leading="close" />);

    expect(screen.getByText("Tools")).toBeTruthy();
    expect(screen.getByText("Check-in")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
  });

  it("is 48px tall, on --card, with one bottom hairline", () => {
    // The measurements are the design's (`2b`/`2c`): the bar is chrome sitting on
    // the page background, so it needs its own surface and a single rule under it.
    renderWithProviders(<ScreenTopBar />);

    const bar = screen.getByTestId("screen-top-bar").props.className as string;

    expect(bar).toContain("h-12");
    expect(bar).toContain("bg-card");
    expect(bar).toContain("border-b");
    expect(bar).toContain("border-border");
  });

  it("labels the close glyph 'Close', not 'Go back'", () => {
    // The glyph and its announced label have to promise the same thing.
    renderWithProviders(<ScreenTopBar leading="close" />);

    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.queryByLabelText("Go back")).toBeNull();
  });

  it("keeps 'Go back' for the detail bar's arrow", () => {
    renderWithProviders(<ScreenTopBar leading="back" />);

    expect(screen.getByLabelText("Go back")).toBeTruthy();
  });

  it("climbs one step up the trail when the leading glyph is pressed", () => {
    renderWithProviders(<ScreenTopBar leading="close" />);

    fireEvent.press(screen.getByLabelText("Close"));

    // `replace`, not `push`: climbing the hierarchy must not stack another entry.
    expect(router.replace).toHaveBeenCalledWith("/tools/check-in");
  });

  it("renders no h1 - the screen's own heading sits in the column below", () => {
    renderWithProviders(<ScreenTopBar />);

    expect(screen.queryByRole("heading")).toBeNull();
  });
});
