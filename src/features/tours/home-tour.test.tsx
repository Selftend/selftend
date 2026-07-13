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
  // Clear all registered targets between tests.
  setTourTarget("home-edit", null);
  setTourTarget("home-navigation", null);
});

describe("HomeTour", () => {
  it("renders nothing until app onboarding is complete", () => {
    setupPreferencesMock(false, []);
    setupMutationMock();
    setTourTarget("home-edit", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(
      screen.queryByText("Arrange the dashboard your way - add, remove and reorder widgets."),
    ).toBeNull();
  });

  it("shows the first unseen stop whose target is registered", async () => {
    setupPreferencesMock(true, []);
    setupMutationMock();
    setTourTarget("home-edit", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(
      await screen.findByText("Arrange the dashboard your way - add, remove and reorder widgets."),
    ).toBeTruthy();
  });

  it("does not show Home tips while another route covers Home", () => {
    mockPathname = "/settings";
    setupPreferencesMock(true, []);
    setupMutationMock();
    setTourTarget("home-edit", fakeView as never);

    renderWithProviders(<HomeTour />);

    expect(
      screen.queryByText("Arrange the dashboard your way - add, remove and reorder widgets."),
    ).toBeNull();
  });

  it("skips stops with no registered target (desktop: no hamburger)", () => {
    setupPreferencesMock(true, ["home:edit"]);
    setupMutationMock();
    // Do NOT register "home-navigation"

    renderWithProviders(<HomeTour />);

    expect(screen.queryByText("Find all Modules and Tools here.")).toBeNull();
    expect(screen.queryByText("Got it")).toBeNull();
  });

  it("dismiss stores the stop key; skip-all stores both home keys", async () => {
    const mutateAsync = setupMutationMock();
    setupPreferencesMock(true, []);
    setTourTarget("home-edit", fakeView as never);

    renderWithProviders(<HomeTour />);

    fireEvent.press(await screen.findByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["home:edit"]);
    });

    // Reset and re-render to test skip-all.
    mutateAsync.mockClear();
    setupPreferencesMock(true, []);

    const { unmount } = renderWithProviders(<HomeTour />);
    fireEvent.press(await screen.findByText("Skip all tips"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["home:edit", "home:navigation"]);
    });

    unmount();
  });
});
