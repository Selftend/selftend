import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as MockView } from "react-native";

import { HomeTour } from "./home-tour";
import { setTourTarget } from "@/src/features/tours/tour-targets";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/";

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
}));

// Mock Modal so it renders children in test (same pattern as module-home-header.test.tsx).
jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  function MockModal({ children, visible }: { children?: ReactNode; visible?: boolean }) {
    return visible === false ? null : React.createElement(actual.View, null, children);
  }
  MockModal.displayName = "MockModal";

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "Modal") return MockModal;
      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateShownButtonTours: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;

const NAVIGATION_COPY = "Find all Modules and Tools here.";

const fakeView = new MockView({});

function setupMutationMock(mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences)) {
  mockUseUpdateShownButtonTours.mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
  return mutateAsync;
}

function setupPreferencesMock(appOnboardingCompleted: boolean, shownButtonTours: string[] = []) {
  mockUseUserPreferences.mockReturnValue({
    data: {
      ...defaultUserPreferences,
      appOnboardingCompleted,
      shownButtonTours,
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/";
  setTourTarget("home-navigation", null);
});

/**
 * One stop since #1956: `home:edit` pointed at the Arrange / Add tool cluster, which went
 * with the dashboard it edited. The tests that used to assert the edit copy ABSENT are
 * re-pointed at the navigation stop rather than deleted - the pathname gate's only
 * coverage was one of them, and an absence assertion for copy that no longer exists
 * passes forever.
 */
describe("HomeTour", () => {
  it("renders nothing until app onboarding is complete", () => {
    setupPreferencesMock(false, []);
    setupMutationMock();
    setTourTarget("home-navigation", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(screen.queryByText(NAVIGATION_COPY)).toBeNull();
    expect(screen.queryByText("Got it")).toBeNull();
  });

  it("shows the navigation stop once its target is registered", async () => {
    setupPreferencesMock(true, []);
    setupMutationMock();
    setTourTarget("home-navigation", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(await screen.findByText(NAVIGATION_COPY)).toBeTruthy();
  });

  it("does not show Home tips while another route covers Home", () => {
    mockPathname = "/settings";
    setupPreferencesMock(true, []);
    setupMutationMock();
    setTourTarget("home-navigation", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(screen.queryByText(NAVIGATION_COPY)).toBeNull();
    expect(screen.queryByText("Got it")).toBeNull();
  });

  /**
   * Skipping is not dismissing. A stop whose target is unregistered (desktop, where there
   * is no hamburger) falls out of the queue WITHOUT being written to `shown_button_tours`
   * - otherwise the tip burns itself on the one screen where it has nothing to point at.
   * This is the proof that used to ride the edit stop; it now rides the only stop left,
   * and the write assertion is what makes it a proof rather than a blank screen.
   */
  it("skips an unregistered stop without marking it shown", async () => {
    const mutateAsync = setupMutationMock();
    setupPreferencesMock(true, []);
    // Do NOT register "home-navigation".

    renderWithProviders(<HomeTour />);

    await waitFor(() => expect(screen.queryByText("Got it")).toBeNull());
    expect(screen.queryByText(NAVIGATION_COPY)).toBeNull();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("dismiss stores the stop key; Skip all tips stores the same one stop", async () => {
    const mutateAsync = setupMutationMock();
    setupPreferencesMock(true, []);
    setTourTarget("home-navigation", fakeView as never);

    renderWithProviders(<HomeTour />);

    fireEvent.press(await screen.findByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["home:navigation"]);
    });

    // Reset and re-render to test skip-all. With one stop it writes the same key: it
    // still renders, because the e2e helpers and every other tour dismiss through it,
    // and an overlay whose second button quietly vanished on Home alone would be the
    // kind of difference nothing but a screenshot could explain.
    mutateAsync.mockClear();
    setupPreferencesMock(true, []);

    const { unmount } = renderWithProviders(<HomeTour />);
    fireEvent.press(await screen.findByText("Skip all tips"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["home:navigation"]);
    });

    unmount();
  });

  it("shows nothing once the one stop has been seen", () => {
    setupPreferencesMock(true, ["home:navigation"]);
    setupMutationMock();
    setTourTarget("home-navigation", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(screen.queryByText("Got it")).toBeNull();
    expect(screen.queryByText("Skip all tips")).toBeNull();
  });
});
