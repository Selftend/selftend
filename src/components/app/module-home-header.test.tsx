import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ModuleHomeHeader } from "./module-home-header";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("react-native", () => {
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
  tourScope = "cbt",
}: { includeProgram?: boolean; shownButtonTours?: string[]; tourScope?: string } = {}) {
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
      tourScope={tourScope}
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
      expect(mutateAsync).toHaveBeenCalledWith(["cbt:tune"]);
    });
  });

  it("marks every header tour as shown when Skip all tips is pressed", async () => {
    renderHeader({ includeProgram: true });

    fireEvent.press(await screen.findByText("Skip all tips"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith([
        "cbt:tune",
        "cbt:notifications",
        "cbt:program",
        "cbt:info",
      ]);
    });
  });

  it("starts with the first unseen action", async () => {
    renderHeader({ shownButtonTours: ["cbt:tune"] });

    expect(
      await screen.findByText(
        "Tap here to manage reminders and notification settings for this feature.",
      ),
    ).toBeTruthy();
  });

  it("shows the program tip when the program action is present", async () => {
    renderHeader({ includeProgram: true, shownButtonTours: ["cbt:tune", "cbt:notifications"] });

    expect(
      await screen.findByText("Tap here to show or restart the CBT program invitation."),
    ).toBeTruthy();
  });

  it("hides a button tour when the same button was shown on another screen", async () => {
    renderHeader({ shownButtonTours: ["cbt:tune", "cbt:notifications"] });

    expect(
      await screen.findByText("Tap here any time to read about how this module works."),
    ).toBeTruthy();
  });

  it("stores dismissals under the scoped key", async () => {
    renderHeader({ tourScope: "cbt", shownButtonTours: [] });

    fireEvent.press(await screen.findByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(["cbt:tune"]);
    });
  });

  it("does not show a tour whose scoped key is already stored", async () => {
    renderHeader({
      tourScope: "cbt",
      shownButtonTours: ["cbt:tune", "cbt:notifications", "cbt:info"],
    });

    expect(screen.queryByText("Got it")).toBeNull();
  });

  it("grandfathers legacy bare keys on every screen", async () => {
    renderHeader({
      tourScope: "mood",
      shownButtonTours: ["tune", "notifications", "info"],
    });

    expect(screen.queryByText("Got it")).toBeNull();
  });

  it("shows tours on a second screen when only another scope was dismissed", async () => {
    renderHeader({
      tourScope: "mood",
      shownButtonTours: ["cbt:tune", "cbt:notifications", "cbt:info"],
    });

    expect(await screen.findByText("Got it")).toBeTruthy();
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
        tourScope="mood"
        hue="be"
        icon="mood"
        description="Log how you're feeling."
        actions={[{ type: "info", onPress: jest.fn() }]}
      />,
    );

    // Hero renders title in both the chip label and the h1 heading; use heading role for uniqueness.
    expect(await screen.findByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(await screen.findByText("Log how you're feeling.")).toBeTruthy();
  });

  it("renders module chip with tint, icon, and module label", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        tourScope="cbt"
        title="Cognitive Behavioral Therapy"
        moduleLabel="CBT"
        description="..."
      />,
    );
    expect(screen.getAllByText("CBT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
  });

  it("falls back to title for chip label when moduleLabel not provided", () => {
    renderWithProviders(
      <ModuleHomeHeader hue="act" icon="explore" tourScope="act" title="ACT" description="..." />,
    );
    // chip + heading both contain "ACT"
    expect(screen.getAllByText("ACT").length).toBeGreaterThanOrEqual(2);
  });

  it("omits the chip when moduleLabel is explicitly null", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        tourScope="cbt"
        title="Cognitive Behavioral Therapy"
        moduleLabel={null}
        description="A focused CBT section..."
      />,
    );
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
    // No chip rendered = no second occurrence of the title text
    expect(screen.getAllByText("Cognitive Behavioral Therapy")).toHaveLength(1);
  });
});
