import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SleepWidget } from "@/src/features/home/widgets/sleep-widget";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockRouter = jest.mocked(router);
const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

function sleepLog(durationMinutes: number, quality: number, loggedAt: string) {
  return {
    id: `s-${loggedAt}`,
    userId: "user-1",
    durationMinutes,
    quality,
    notes: "",
    loggedAt,
    createdAt: loggedAt,
  };
}

describe("SleepWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedDate.mockReturnValue({ selectedDate: currentDateKey(), isToday: true });
  });

  it("renders the Sleep tracker header", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);
    renderWithProviders(<SleepWidget userId="user-1" />);
    expect(screen.getByText("Sleep tracker")).toBeTruthy();
  });

  it("shows the 7-night average duration and quality", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [
        sleepLog(360, 3, new Date().toISOString()),
        sleepLog(420, 4, new Date().toISOString()),
      ],
    } as unknown as ReturnType<typeof useSleepLogs>);
    renderWithProviders(<SleepWidget userId="user-1" />);
    expect(screen.getByText("6.5h")).toBeTruthy();
    expect(screen.getByText("3.5")).toBeTruthy();
  });

  it("shows the Logged badge when there is an entry today", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [sleepLog(360, 3, new Date().toISOString())],
    } as unknown as ReturnType<typeof useSleepLogs>);
    renderWithProviders(<SleepWidget userId="user-1" />);
    expect(screen.getByText("Logged")).toBeTruthy();
  });

  it("hides the badge when today has no entry", () => {
    mockUseSelectedDate.mockReturnValue({ selectedDate: "2026-05-30", isToday: false });
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);
    renderWithProviders(<SleepWidget userId="user-1" />);
    expect(screen.queryByText("Logged")).toBeNull();
  });

  it("routes Log sleep and Open", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);
    renderWithProviders(<SleepWidget userId="user-1" />);
    fireEvent.press(screen.getByText("Log sleep"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/new");
    fireEvent.press(screen.getByText("Open"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep");
  });
});
