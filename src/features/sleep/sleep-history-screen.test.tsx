import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { SectionList } from "react-native";

import SleepHistoryScreen from "@/src/features/sleep/sleep-history-screen";
import { useSleepHistoryPages } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/sleep/history",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepHistoryPages: jest.fn(),
  // The row seeds the detail cache before navigating; the real implementation
  // is exercised in sleep-recent-list.test.tsx, where queries are unmocked.
  seedSleepLogDetail: jest.fn(),
}));

const mockUseSleepHistoryPages = useSleepHistoryPages as jest.MockedFunction<
  typeof useSleepHistoryPages
>;
const mockRouter = jest.mocked(router);

function log(dayKey: string, overrides: Partial<SleepLog> = {}): SleepLog {
  const loggedAt = `${dayKey}T06:50:00Z`;
  return {
    id: `log-${dayKey}`,
    userId: "user-1",
    durationMinutes: 450,
    quality: 4,
    notes: "",
    loggedAt,
    loggedOffsetMinutes: 0,
    dayKey,
    entryDay: dayKey,
    window: null,
    createdAt: loggedAt,
    ...overrides,
  };
}

interface PagesState {
  pages?: SleepLog[][];
  hasNextPage?: boolean;
  isError?: boolean;
  isFetchingNextPage?: boolean;
  isPending?: boolean;
}

const fetchNextPage = jest.fn();
const refetch = jest.fn();

function mockPages({
  pages,
  hasNextPage = false,
  isError = false,
  isFetchingNextPage = false,
  isPending = false,
}: PagesState) {
  mockUseSleepHistoryPages.mockReturnValue({
    data: pages ? { pages, pageParams: pages.map((_, i) => i * 50) } : undefined,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } as unknown as ReturnType<typeof useSleepHistoryPages>);
}

// Today's day key, so grouping lands the fixture under "Today" whatever day the
// suite runs on.
function todayKey() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

describe("SleepHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the screen header, a grouped row, and no partial aggregates", () => {
    mockPages({ pages: [[log(todayKey(), { notes: "Cold room." })]] });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.getByRole("heading", { name: "All history" })).toBeTruthy();
    expect(screen.getByText("Every sleep entry you have logged, newest first.")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("7h 30m")).toBeTruthy();
    expect(screen.getByText("Cold room.")).toBeTruthy();
    // Averages under paging cover only the rows that happen to be loaded (#705).
    expect(screen.queryByText(/^avg /)).toBeNull();
  });

  it("opens the entry when a row is pressed", () => {
    const key = todayKey();
    mockPages({ pages: [[log(key)]] });

    renderWithProviders(<SleepHistoryScreen />);

    fireEvent.press(screen.getByLabelText(/7h 30m of sleep, Good/));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/tools/sleep/[id]",
      params: { id: `log-${key}` },
    });
  });

  it("captions a month row from its grouping day, not the wake bound", () => {
    // A windowed July 31 → August 1 sleep files under July (dayKey is the civil
    // day at sleep start); captioning the row from `loggedAt` would print
    // "Aug 1" under a heading that says July.
    mockPages({
      pages: [
        [
          log("2026-07-31", {
            loggedAt: "2026-08-01T05:00:00Z",
            window: {
              startedAt: "2026-07-31T21:00:00.000Z",
              startedOffsetMinutes: 0,
              endedAt: "2026-08-01T05:00:00.000Z",
              endedOffsetMinutes: 0,
            },
          }),
        ],
      ],
    });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.getByText("July 2026")).toBeTruthy();
    expect(screen.getByText("Jul 31")).toBeTruthy();
    expect(screen.queryByText("Aug 1")).toBeNull();
  });

  it("fetches the next page when the list reaches its end", () => {
    mockPages({ pages: [[log(todayKey())]], hasNextPage: true });

    renderWithProviders(<SleepHistoryScreen />);
    screen.UNSAFE_getByType(SectionList).props.onEndReached();

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not queue a second page while one is already in flight", () => {
    mockPages({ pages: [[log(todayKey())]], hasNextPage: true, isFetchingNextPage: true });

    renderWithProviders(<SleepHistoryScreen />);
    screen.UNSAFE_getByType(SectionList).props.onEndReached();

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("shows the empty state only once a loaded history turns out to be empty", () => {
    mockPages({ pages: [[]] });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("stays silent while the first page is still loading", () => {
    // Claiming "nothing here yet" during the initial fetch tells a returning
    // user their history is gone (#734).
    mockPages({ isPending: true });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.queryByText("Nothing here yet")).toBeNull();
  });

  it("says the load failed rather than claiming the history is empty", () => {
    mockPages({ isError: true });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.getByText("Couldn't load your history")).toBeTruthy();
    expect(screen.queryByText("Nothing here yet")).toBeNull();
  });

  it("retries the failed first page from the error state", () => {
    mockPages({ isError: true });

    renderWithProviders(<SleepHistoryScreen />);
    fireEvent.press(screen.getByText("Retry"));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a loaded history on screen when a background refetch fails", () => {
    mockPages({ pages: [[log(todayKey())]], isError: true });

    renderWithProviders(<SleepHistoryScreen />);

    expect(screen.getByText("7h 30m")).toBeTruthy();
    expect(screen.queryByText("Couldn't load your history")).toBeNull();
  });
});
