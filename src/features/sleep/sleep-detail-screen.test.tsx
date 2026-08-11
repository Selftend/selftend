import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SleepDetailScreen from "@/src/features/sleep/sleep-detail-screen";
import { useDeleteSleepLog, useSleepLog, useSleepLogs } from "@/src/features/sleep/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
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
  loggedOffsetMinutes: 0,
  dayKey: "2026-07-20",
  entryDay: "2026-07-20",
  window: null,
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

  it("collapses four cards into one line: duration, quality word, and the note row", () => {
    renderWithProviders(<SleepDetailScreen />);

    // One meta line, joined in code - not a "Duration" card and a "Quality" card.
    expect(screen.getByText("7h 30m · Good")).toBeTruthy();
    expect(screen.queryByText("Duration")).toBeNull();
    expect(screen.queryByText("Quality")).toBeNull();
    expect(screen.getByText("Read before bed")).toBeTruthy();
  });

  it("shows the window bounds on the subline for a windowed entry", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [
        {
          ...entry,
          window: {
            startedAt: "2026-07-20T20:30:00.000Z",
            startedOffsetMinutes: 120,
            endedAt: "2026-07-21T04:00:00.000Z",
            endedOffsetMinutes: 120,
          },
        },
      ],
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepDetailScreen />);

    // Each bound reads in the frame captured at that bound: 20:30Z at +120 is
    // 22:30 local, 04:00Z at +120 is 06:00 local.
    expect(screen.getByText(/10:30/)).toBeTruthy();
    expect(screen.getByText(/6:00/)).toBeTruthy();
  });

  it("renders no hairline rows for an entry with no note", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [{ ...entry, notes: "  " }],
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepDetailScreen />);

    expect(screen.queryByTestId("detail-row")).toBeNull();
    expect(screen.queryByText("Notes")).toBeNull();
  });

  it("routes to the edit screen", () => {
    renderWithProviders(<SleepDetailScreen />);

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/s-1/edit");
  });

  it("opens the delete confirmation from the icon button", () => {
    renderWithProviders(<SleepDetailScreen />);

    fireEvent.press(screen.getByLabelText("Delete"));

    expect(screen.getByTestId("confirm-dialog-confirm")).toBeTruthy();
  });

  it("carries the all-history door at the foot", () => {
    renderWithProviders(<SleepDetailScreen />);

    fireEvent.press(screen.getByText("Show all history"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/history");
  });

  it("shows the not-found state when the entry is missing", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepDetailScreen />);

    expect(screen.getByText("We couldn't find that sleep entry.")).toBeTruthy();
  });
});
