import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Platform } from "react-native";

import { AuthLandingBlock } from "./auth-landing-block";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");

  return {
    router: { replace: jest.fn(), push: jest.fn() },
    usePathname: () => "/",
    // SignInForm consumes the conversion collision's email handoff on focus
    // (#1443); outside a navigator, mount stands in for focus.
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

jest.mock("@/src/features/auth/api", () => ({
  signInWithPassword: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  isAppleSignInAvailable: jest.fn().mockResolvedValue(false),
  resendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
});

afterEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
});

describe("AuthLandingBlock", () => {
  it("shows the self-help disclaimer so the not-medical boundary is visible without an account", () => {
    renderWithProviders(<AuthLandingBlock />);

    expect(
      screen.getByText(
        "Selftend is for guided self-help when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders.",
      ),
    ).toBeTruthy();
  });

  it("links to crisis guidance from the public landing", () => {
    renderWithProviders(<AuthLandingBlock />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(mockPush).toHaveBeenCalledWith("/crisis");
  });

  it("links to the terms, privacy, and cookie policies from the public landing", () => {
    renderWithProviders(<AuthLandingBlock />);

    fireEvent.press(screen.getByText("Terms of service"));
    fireEvent.press(screen.getByText("Privacy policy"));
    fireEvent.press(screen.getByText("Cookie policy"));

    expect(mockPush).toHaveBeenCalledWith("/terms");
    expect(mockPush).toHaveBeenCalledWith("/privacy");
    expect(mockPush).toHaveBeenCalledWith("/cookies");
  });

  /**
   * Recording is opt-out, so the landing's cross-links record like any other
   * (#1265, O3) - even though every destination here already has the root as its
   * Up, which is where this page sits, so the Escape's off-trail test will
   * ignore what is recorded. That is the point of the inversion: the alternative
   * is a judgement at each call site, and the next link added to this row would
   * be the one that forgot.
   */
  it("records the landing as the Origin for its policy and crisis links", () => {
    renderWithProviders(<AuthLandingBlock />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/",
      forPathname: "/crisis",
    });
  });

  it("shows the get-the-app section on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<AuthLandingBlock />);

    expect(screen.getByText("Get the mobile app")).toBeTruthy();
  });
});
