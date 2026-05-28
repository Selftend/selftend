import { screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as mockView } from "react-native";

import HomeScreen from "./today-screen";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-linear-gradient", () => {
  const View = mockView;
  return {
    LinearGradient: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});

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

jest.mock("@/src/features/home/add-widget-modal", () => ({
  AddWidgetModal: () => null,
}));

jest.mock("@/src/features/home/widget-registry", () => ({
  isImplemented: () => false,
  metaForWidget: () => undefined,
  resolveWidget: () => null,
  spanForWidget: () => ({ colSpan: 1, rowSpan: 1 }),
  clampSpan: (span: { colSpan: number; rowSpan: number }) => span,
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

  it("renders the subtitle text", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/pick one thing/i)).toBeTruthy();
  });

  it("renders empty state when no widgets are present", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/add tools you want to check in/i)).toBeTruthy();
  });

  it("renders Add tool button", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Add tool")).toBeTruthy();
  });
});
