import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import LegalScreen from "../../../app/(app)/legal";
import PrivacyScreen from "../../../app/privacy";
import SecurityScreen from "../../../app/security";
import { ScreenEscape } from "@/src/components/app/screen-escape";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/legal";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/legal";
});

/**
 * The policy cross-links record where they were reached from (#1267, clause O3).
 *
 * The policy pages are this batch's headline off-trail set: they cross-link
 * heavily to each other (legal → privacy → security → privacy...), every one of
 * them is a one-crumb screen whose trail hides, and each sits directly off the
 * root - so before this batch, every step of a policy excursion could only be
 * unwound by jumping to Home.
 *
 * ⚠️ Every assertion is on the STORE. `usePushWithOrigin` pushes *through*
 * `router.push`, so an assertion on the router passes identically whether or
 * not the call site was ever migrated.
 */
describe("policy cross-links record the page they were left from", () => {
  it("records /legal as the Origin when opening the privacy policy", () => {
    renderWithProviders(<LegalScreen />);

    fireEvent.press(screen.getByText("Open privacy policy"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/legal",
      forPathname: "/privacy",
    });
  });

  it("records /privacy as the Origin when crossing to security", () => {
    mockPathname = "/privacy";
    renderWithProviders(<PrivacyScreen />);

    fireEvent.press(screen.getByText("How we protect your data"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/privacy",
      forPathname: "/security",
    });
  });

  it("records /security as the Origin when crossing back to privacy", () => {
    mockPathname = "/security";
    renderWithProviders(<SecurityScreen />);

    fireEvent.press(screen.getByText("Read the full Privacy Policy"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/security",
      forPathname: "/privacy",
    });
  });

  /**
   * The acceptance criterion end to end, through the real route map: reach a
   * policy page from a cross-link and the Escape over there returns to the
   * referring page, named. `/legal` has a `STATIC_ROUTES` name, so this covers
   * the named half of #1253's announcement rule.
   */
  it("lets the Escape on /privacy return to Legal, named", () => {
    renderWithProviders(<LegalScreen />);
    fireEvent.press(screen.getByText("Open privacy policy"));
    // The screen the user left really is gone before the next one mounts, so
    // nothing below can match a leftover node from the departed tree.
    screen.unmount();

    mockPathname = "/privacy";
    renderWithProviders(<ScreenEscape />);

    expect(screen.getByText("Legal")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Back to Legal"));
    expect(router.replace).toHaveBeenCalledWith("/legal");
  });

  /**
   * The unnameable half of the same rule. `/security` deliberately has no
   * `STATIC_ROUTES` entry (#1209: the policy routes are one-crumb screens whose
   * trail hides), so `nameOrigin` has nothing to call it - and the Escape must
   * still FOLLOW the Origin under a bare "Go back" rather than fall back to Up
   * (#1261): a naming failure must never become a destination failure.
   */
  it("still follows an Origin the route map cannot name", () => {
    mockPathname = "/security";
    renderWithProviders(<SecurityScreen />);
    fireEvent.press(screen.getByText("Read the full Privacy Policy"));
    screen.unmount();

    mockPathname = "/privacy";
    renderWithProviders(<ScreenEscape />);

    fireEvent.press(screen.getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/security");
  });
});
