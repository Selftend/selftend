import { screen } from "@testing-library/react-native";

import { ScreenHeader } from "./screen-header";
import { ScreenLoading } from "./screen-state";
import { peekOrigin, useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  usePathname: () => "/tools/journal/abc",
}));

/**
 * An Origin has to survive a screen that LOADS first (#1328 meeting #1261).
 *
 * Giving loading branches chrome means such a screen mounts two Escapes in turn
 * - the placeholder's, then its own - and an arrival can only be consumed once.
 * The first version of that change had the spinner's Escape eat the Origin, so
 * every Origin-carrying screen with a loading branch silently fell back to Up:
 * the arrow still worked, it just went somewhere the user had never been. These
 * pin the handover, because nothing else would have noticed.
 */
describe("an Origin carried into a screen that loads first", () => {
  beforeEach(() => {
    useNavigationOriginStore.setState({ pending: null });
  });

  function arriveFrom(origin: string) {
    useNavigationOriginStore.setState({
      pending: { origin, forPathname: "/tools/journal/abc" },
    });
  }

  it("names the Origin on the loading screen, and still names it once loaded", () => {
    arriveFrom("/modules/cbt");

    const { rerender } = renderWithProviders(<ScreenLoading title="Loading" />);
    expect(screen.getByLabelText("Back to CBT")).toBeTruthy();

    // The data lands: the placeholder unmounts and the screen's own chrome
    // mounts a SECOND Escape, which peeks the store again.
    rerender(<ScreenHeader title="Entry" />);

    expect(screen.getByLabelText("Back to CBT")).toBeTruthy();
  });

  it("leaves the arrival unconsumed while only the placeholder has rendered", () => {
    // The mechanism behind the case above, asserted directly: a placeholder
    // peeks without consuming, so the entry is still there for the real screen.
    arriveFrom("/modules/cbt");

    renderWithProviders(<ScreenLoading title="Loading" />);

    expect(peekOrigin("/tools/journal/abc")).toBe("/modules/cbt");
  });

  it("consumes the arrival once the real screen mounts", () => {
    // And the placeholder must not DEFER consumption forever: the screen that
    // replaces it still retires the entry, which is what keeps a later arrival
    // at the same pathname from being served a dead Origin.
    arriveFrom("/modules/cbt");

    const { rerender } = renderWithProviders(<ScreenLoading title="Loading" />);
    rerender(<ScreenHeader title="Entry" />);

    expect(peekOrigin("/tools/journal/abc")).toBeNull();
  });
});
