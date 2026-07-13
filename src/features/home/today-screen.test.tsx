import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as mockView } from "react-native";

import HomeScreen from "./today-screen";
import { renderWithProviders } from "@/test/render-with-providers";

let mockWidgetIds: string[] = [];
const mockAddWidget = jest.fn();
const mockRemoveWidget = jest.fn();
const mockRestoreWidget = jest.fn();
const mockReorderWidgets = jest.fn();

jest.mock("react-native-svg", () => {
  const View = mockView;
  return {
    Svg: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Circle: () => null,
  };
});

jest.mock("react-native-sortables", () => ({
  __esModule: true,
  default: {
    Flex: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Handle: ({ children }: { children?: ReactNode }) => <>{children}</>,
  },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: { selectedConcerns: [] } }),
  useUpdateShownButtonTours: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/src/features/onboarding/queries", () => ({
  useApplyWidgetSuggestions: () => ({
    isPending: false,
    isError: false,
    mutate: jest.fn(),
  }),
}));

jest.mock("@/src/components/app/app-onboarding-wizard", () => {
  const { View } = require("react-native");
  return {
    AppOnboardingWizard: ({
      visible,
      includeWelcome,
    }: {
      visible: boolean;
      includeWelcome?: boolean;
    }) =>
      visible ? (
        <View
          testID="suggestion-wizard-visible"
          accessibilityLabel={includeWelcome ? "with welcome" : "without welcome"}
        />
      ) : null,
  };
});

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28", isToday: true }),
}));

jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: () => ({
    data: mockWidgetIds.map((widgetId, position) => ({ widgetId, position })),
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useAddWidget: () => ({ mutate: mockAddWidget, isPending: false }),
  useRemoveWidget: () => ({ mutate: mockRemoveWidget, isPending: false }),
  useRestoreWidget: () => ({ mutate: mockRestoreWidget, isPending: false }),
  useReorderWidgets: () => ({ mutate: mockReorderWidgets, isPending: false }),
}));

jest.mock("@/src/features/home/add-widget-modal", () => {
  const { View } = require("react-native");
  return {
    AddWidgetModal: ({ visible }: { visible: boolean }) =>
      visible ? <View testID="add-widget-modal-visible" /> : null,
  };
});

jest.mock("@/src/features/home/widget-registry", () => ({
  isImplemented: () => true,
  metaForWidget: (widgetId: string) => ({
    titleKey:
      widgetId === "mood-checkin"
        ? "home.widgets.moodCheckin.title"
        : "home.widgets.moodTrend.title",
  }),
  resolveWidget: () => null,
}));

beforeEach(() => {
  mockWidgetIds = [];
  jest.clearAllMocks();
  for (const mutation of [mockAddWidget, mockRemoveWidget, mockRestoreWidget, mockReorderWidgets]) {
    mutation.mockImplementation((_value, options) => options?.onSuccess?.());
  }
});

function renderPopulatedHome() {
  mockWidgetIds = ["mood-checkin", "mood-trend"];
  renderWithProviders(<HomeScreen />);
  fireEvent(screen.getByTestId("home-layout"), "layout", {
    nativeEvent: { layout: { width: 900 } },
  });
}

describe("HomeScreen hero", () => {
  it("renders the greeting hero with date eyebrow", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/good (morning|afternoon|evening)\./i)).toBeTruthy();
  });

  it("renders Dashboard section heading", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("renders empty state when no widgets are present", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/add tools you want to check in/i)).toBeTruthy();
  });

  it("renders Add tool button", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByRole("button", { name: /add to your dashboard/i })).toBeTruthy();
  });

  it("opens the add-widget modal from the manual action", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /add manually/i }));
    expect(screen.getByTestId("add-widget-modal-visible")).toBeTruthy();
  });

  it("opens the suggestion wizard only from an empty Home", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /get suggestions/i }));
    expect(screen.getByTestId("suggestion-wizard-visible")).toBeTruthy();
    expect(screen.getByLabelText("without welcome")).toBeTruthy();
  });

  it("shows undo only in edit mode and disables it before the first edit", () => {
    renderPopulatedHome();

    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    fireEvent.press(screen.getAllByRole("button", { name: "Done" })[0]);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("undoes multiple removals in reverse order", () => {
    renderPopulatedHome();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    fireEvent.press(screen.getByRole("button", { name: "Remove Check-in" }));
    fireEvent.press(screen.getByRole("button", { name: "Remove Mood, last 7 days" }));

    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeEnabled();
    fireEvent.press(undo);
    expect(mockRestoreWidget).toHaveBeenLastCalledWith(
      { widgetId: "mood-trend", position: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(mockRestoreWidget).toHaveBeenLastCalledWith(
      { widgetId: "mood-checkin", position: 0 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});
