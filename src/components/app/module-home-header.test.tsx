import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ModuleHomeHeader } from "./module-home-header";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
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
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

function renderHeader({ shownButtonTours = [] }: { shownButtonTours?: string[] } = {}) {
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
    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("marks only the current tour as shown when Got it is pressed", async () => {
    renderHeader();

    fireEvent.press(await screen.findByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          shownButtonTours: ["tune"],
        }),
      );
    });
  });

  it("marks every header tour as shown when Skip all tips is pressed", async () => {
    renderHeader();

    fireEvent.press(await screen.findByText("Skip all tips"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          shownButtonTours: ["tune", "notifications", "info"],
        }),
      );
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
});
