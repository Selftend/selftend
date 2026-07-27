import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SleepTrackerScreen from "@/src/features/sleep/sleep-tracker-screen";
import { useSleepLogs, useSleepLogCount } from "@/src/features/sleep/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/sleep",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
  useSleepLogCount: jest.fn(),
}));

const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;
const mockUseSleepLogCount = useSleepLogCount as jest.MockedFunction<typeof useSleepLogCount>;
const mockRouter = jest.mocked(router);

function sleepLog(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "s-1",
    userId: "user-1",
    durationMinutes: 450,
    quality: 4,
    notes: "",
    loggedAt: "2026-07-20T22:30:00.000Z",
    createdAt: "2026-07-20T22:30:00.000Z",
    ...overrides,
  };
}

describe("SleepTrackerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSleepLogCount.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useSleepLogCount>);
  });

  it("renders the ink field header with title, stats, and empty-state subline", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByRole("heading", { name: "Sleep tracker" })).toBeTruthy();
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // Calm muted subline when nothing is logged - never a shame state.
    expect(screen.getByText("No sleep logged yet")).toBeTruthy();
    // Section headings render on the sheet.
    expect(screen.getByRole("heading", { name: "Recent entries" })).toBeTruthy();
  });

  it("shows the last-logged subline when a night exists", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [sleepLog()],
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sleep logged yet")).toBeNull();
  });

  it("omits the subline until the logs query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sleep logged" there would erase a returning user's real history.
    mockUseSleepLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.queryByText("No sleep logged yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("routes to the new sleep log screen from the CTA", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    fireEvent.press(screen.getByText("Log last night's sleep"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/new");
  });
});
