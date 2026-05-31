import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as mockView } from "react-native";

import HomeScreen from "./today-screen";
import { renderWithProviders } from "@/test/render-with-providers";

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

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28", isToday: true }),
}));

jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: () => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useAddWidget: () => ({ mutate: jest.fn() }),
  useRemoveWidget: () => ({ mutate: jest.fn() }),
  useReorderWidgets: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/src/features/home/add-widget-modal", () => {
  const { View } = require("react-native");
  return {
    AddWidgetModal: ({ visible }: { visible: boolean }) =>
      visible ? <View testID="add-widget-modal-visible" /> : null,
  };
});

jest.mock("@/src/features/home/widget-registry", () => ({
  isImplemented: () => false,
  metaForWidget: () => undefined,
  resolveWidget: () => null,
}));

describe("HomeScreen hero", () => {
  it("renders 44px greeting hero with date eyebrow", () => {
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
    expect(screen.getByRole("button", { name: /add to your plan/i })).toBeTruthy();
  });

  it("opens the add-widget modal when the empty-state card is pressed", () => {
    renderWithProviders(<HomeScreen />);
    const emptyCard = screen.getByRole("button", {
      name: /add tools you want to check in/i,
    });
    fireEvent.press(emptyCard);
    expect(screen.getByTestId("add-widget-modal-visible")).toBeTruthy();
  });
});
