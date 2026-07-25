import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SleepDetailScreen from "@/src/features/sleep/sleep-detail-screen";
import { useDeleteSleepLog, useSleepLog, useSleepLogs } from "@/src/features/sleep/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "s-1" })),
  usePathname: () => "/tools/sleep/s-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useDeleteSleepLog: jest.fn(),
  useSleepLog: jest.fn(),
  useSleepLogs: jest.fn(),
}));

const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;
const mockUseSleepLog = useSleepLog as jest.MockedFunction<typeof useSleepLog>;
const mockUseDeleteSleepLog = useDeleteSleepLog as jest.MockedFunction<typeof useDeleteSleepLog>;
const mockRouter = jest.mocked(router);

const entry = {
  id: "s-1",
  userId: "user-1",
  durationMinutes: 450,
  quality: 4,
  notes: "Read before bed",
  loggedAt: "2026-07-20T22:30:00.000Z",
  createdAt: "2026-07-20T22:30:00.000Z",
};

describe("SleepDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSleepLogs.mockReturnValue({
      data: [entry],
    } as unknown as ReturnType<typeof useSleepLogs>);
    mockUseSleepLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSleepLog>);
    mockUseDeleteSleepLog.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteSleepLog>);
  });

  it("renders duration, quality word, and notes in the room", () => {
    renderWithProviders(<SleepDetailScreen />);

    expect(screen.getByRole("heading", { name: "Sleep entry" })).toBeTruthy();
    expect(screen.getByText("7h 30m")).toBeTruthy();
    // Quality numeral inside the ramp circle plus its word beside it.
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Read before bed")).toBeTruthy();
  });

  it("routes to the edit screen", () => {
    renderWithProviders(<SleepDetailScreen />);

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/s-1/edit");
  });

  it("opens the delete confirmation", () => {
    renderWithProviders(<SleepDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));

    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();
  });

  it("shows the not-found state when the entry is missing", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepDetailScreen />);

    expect(screen.getByText("We couldn't find that sleep entry.")).toBeTruthy();
  });
});
