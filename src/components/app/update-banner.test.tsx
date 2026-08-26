import { Platform } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";

import { UpdateBanner } from "./update-banner";
import { renderWithProviders } from "@/test/render-with-providers";

// Presentational since #1474: the hook mounts once in the protected shell and
// the banner is driven entirely by props, so no hook mock is needed here.
describe("UpdateBanner", () => {
  const act = jest.fn();
  const dismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no update is available", () => {
    renderWithProviders(<UpdateBanner available={false} act={act} dismiss={dismiss} />);
    expect(screen.queryByText("A newer version of Selftend is available.")).toBeNull();
  });

  it("offers quietly when an update is available, with working actions", () => {
    renderWithProviders(<UpdateBanner available act={act} dismiss={dismiss} />);

    expect(screen.getByText("A newer version of Selftend is available.")).toBeTruthy();

    // Whichever platform jest-expo runs, the action is the same wired button -
    // what matters here is that pressing it calls act(). Which LABEL appears
    // per platform is asserted separately below, because that is where #529
    // lived.
    fireEvent.press(screen.getByText(/Refresh|Open Google Play|Open the App Store/));
    expect(act).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText("Dismiss"));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  // #529: the label used to be a web/native pair whose "native" string was
  // "Open Google Play", so an iPhone was told to open Google Play. This suite
  // runs under Platform.OS === "ios" by default, which is precisely why the old
  // assertion above passed while matching "Open Google Play" - the bug was
  // pinned as expected behaviour.
  describe("names the right store per platform", () => {
    it.each([
      ["ios", "Open the App Store", "Open Google Play"],
      ["android", "Open Google Play", "Open the App Store"],
      ["web", "Refresh", "Open Google Play"],
    ] as const)("on %s shows %s and never %s", (os, expected, forbidden) => {
      const spy = jest.replaceProperty(Platform, "OS", os);
      try {
        renderWithProviders(<UpdateBanner available act={act} dismiss={dismiss} />);
        expect(screen.getByText(expected)).toBeTruthy();
        expect(screen.queryByText(forbidden)).toBeNull();
      } finally {
        spy.restore();
      }
    });
  });
});
