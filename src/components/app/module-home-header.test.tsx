import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ModuleHomeHeader } from "./module-home-header";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("react-native", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  function MockModal({ children, visible }: { children?: React.ReactNode; visible?: boolean }) {
    return visible === false ? null : React.createElement(actual.View, null, children);
  }
  MockModal.displayName = "MockModal";

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "Modal") {
        return MockModal;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("expo-router", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");

  return {
    router: {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      push: jest.fn(),
    },
    usePathname: () => "/modules/cbt",
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("expo-linear-gradient", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return { LinearGradient: View };
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

function renderHeader({
  includeProgram = false,
  shownButtonTours = [],
}: { includeProgram?: boolean; shownButtonTours?: string[] } = {}) {
  mockUseUserPreferences.mockReturnValue({
    data: {
      ...defaultUserPreferences,
      shownButtonTours,
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);

  return renderWithProviders(
    <ModuleHomeHeader
      title="CBT"
      actions={[
        { type: "tune", onPress: jest.fn() },
        { type: "notifications", targetKey: "cbt" },
        ...(includeProgram ? [{ type: "program" as const, onPress: jest.fn() }] : []),
        { type: "info", onPress: jest.fn() },
      ]}
    />,
  );
}

describe("ModuleHomeHeader button tours", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockUseUpdateShownButtonTours.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
  });

  it("marks only the current tour as shown when Got it is pressed", async () => {
    renderHeader();

    fireEvent.press(await screen.findByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["tune"]);
    });
  });

  it("marks every header tour as shown when Skip all tips is pressed", async () => {
    renderHeader({ includeProgram: true });

    fireEvent.press(await screen.findByText("Skip all tips"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["tune", "notifications", "program", "info"]);
    });
  });

  it("starts with the first unseen action", async () => {
    renderHeader({ shownButtonTours: ["tune"] });

    expect(
      await screen.findByText(
        "Tap here to manage reminders and notification settings for this feature.",
      ),
    ).toBeTruthy();
  });

  it("shows the program tip when the program action is present", async () => {
    renderHeader({ includeProgram: true, shownButtonTours: ["tune", "notifications"] });

    expect(
      await screen.findByText("Tap here to show or restart the CBT program invitation."),
    ).toBeTruthy();
  });

  it("hides a button tour when the same button was shown on another screen", async () => {
    renderHeader({ shownButtonTours: ["tune", "notifications"] });

    expect(
      await screen.findByText("Tap here any time to read about how this module works."),
    ).toBeTruthy();
  });
});

describe("ModuleHomeHeader hero mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateShownButtonTours.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateShownButtonTours>);
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, shownButtonTours: ["tune", "notifications", "info"] },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("renders the title and tagline when hue and icon are provided", async () => {
    renderWithProviders(
      <ModuleHomeHeader
        title="Check-in"
        hue="be"
        icon="mood"
        description="Log how you're feeling."
        actions={[{ type: "info", onPress: jest.fn() }]}
      />,
    );

    // ToolHero renders title in both the chip label and the h1 heading; use heading role.
    expect(await screen.findByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(await screen.findByText("Log how you're feeling.")).toBeTruthy();
  });

  it("renders module chip with tint, icon, and module label", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        title="Cognitive Behavioral Therapy"
        moduleLabel="CBT"
        description="…"
      />,
    );
    expect(screen.getAllByText("CBT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
  });

  it("falls back to title for chip label when moduleLabel not provided", () => {
    renderWithProviders(<ModuleHomeHeader hue="act" icon="explore" title="ACT" description="…" />);
    // chip + heading both contain "ACT"
    expect(screen.getAllByText("ACT").length).toBeGreaterThanOrEqual(2);
  });
});
