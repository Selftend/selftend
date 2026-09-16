import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import PrivacyScreen from "../../../app/privacy";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { linkHref } from "@/test/expo-router-link-mock";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/privacy",
  // Navigation itself is the Link's and is not simulated - which is the point:
  // a press must reach the router through NOTHING else.
  Link: require("@/test/expo-router-link-mock").MockLink,
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
});

/**
 * `/security` and `/account-deletion` were the site's two orphans (#2476): the
 * privacy page reached the first through a `Button` with a press handler - no
 * `href`, so no edge in the link graph - and nothing public reached the second
 * at all. Both are anchors now, queried here by link role and name, the way the
 * landing footer's test does. A source grep would match a string, not an edge.
 */
describe("the privacy page's cross-links are anchors", () => {
  it("links to the security page under its existing string", () => {
    renderWithProviders(<PrivacyScreen />);

    // Two links carry this name since #2467: the in-body anchor and the site
    // footer's /security entry, labelled with that page's H1. Both point at
    // /security; the in-body one comes first in tree order.
    const [inBody, footer] = screen.getAllByRole("link", { name: "How we protect your data" });
    expect(inBody.props.href).toBe("/security");
    expect(footer.props.href).toBe("/security");
  });

  it("links to account deletion under the legal screen's existing string", () => {
    renderWithProviders(<PrivacyScreen />);

    expect(linkHref("Open account deletion")).toBe("/account-deletion");
  });

  /**
   * The Origin the old button recorded (#1267, clause O3) survives the move to
   * an anchor: the Escape on the destination still returns here rather than
   * jumping Up to Home. And the router is never pushed from the screen itself -
   * the anchor navigates, so an assertion on `router.push` here would pass
   * whether or not the control were a real link.
   */
  it("records /privacy as the Origin for each destination without pushing the router itself", () => {
    renderWithProviders(<PrivacyScreen />);

    fireEvent.press(screen.getAllByRole("link", { name: "How we protect your data" })[0]);
    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/privacy",
      forPathname: "/security",
    });

    fireEvent.press(screen.getByText("Open account deletion"));
    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/privacy",
      forPathname: "/account-deletion",
    });

    expect(router.push).not.toHaveBeenCalled();
  });
});
