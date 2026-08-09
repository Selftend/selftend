import { fireEvent, screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import HabitsHistoryScreen from "@/src/features/habits/habits-history-screen";
import { useHabitLogPages, useHabits } from "@/src/features/habits/queries";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { currentDateKey } from "@/src/features/habits/scheduling";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits/history",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
  useHabitLogPages: jest.fn(),
}));

const mockUseHabits = useHabits as jest.MockedFunction<typeof useHabits>;
const mockUseHabitLogPages = useHabitLogPages as jest.MockedFunction<typeof useHabitLogPages>;

const fetchNextPage = jest.fn();
const refetch = jest.fn();

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h-1",
    userId: "user-1",
    name: "Read",
    kind: "build",
    identity: "I'm a reader",
    cuePlan: "",
    stackAfter: "",
    cravingPairing: "",
    twoMinuteVersion: "",
    rewardNote: "",
    cadence: "daily",
    customDays: [],
    color: "primary",
    archivedAt: null,
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    ...overrides,
  };
}

function habitLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "log-1",
    userId: "user-1",
    habitId: "h-1",
    loggedOn: "2026-07-20",
    note: "",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    ...overrides,
  };
}

function mockPages(
  pages: HabitLog[][],
  overrides: Record<string, unknown> = {},
): ReturnType<typeof useHabitLogPages> {
  return {
    data: { pages, pageParams: pages.map((_, i) => i) },
    fetchNextPage,
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch,
    ...overrides,
  } as unknown as ReturnType<typeof useHabitLogPages>;
}

function mockDefaults() {
  mockUseHabits.mockReturnValue({
    data: [habit()],
  } as unknown as ReturnType<typeof useHabits>);
  mockUseHabitLogPages.mockReturnValue(mockPages([[]]));
}

describe("HabitsHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders day groups inside the act room - no field gradient", () => {
    mockUseHabitLogPages.mockReturnValue(
      mockPages([
        [
          habitLog({ id: "log-1", loggedOn: "2026-07-20", note: "Ten pages" }),
          habitLog({ id: "log-2", loggedOn: "2026-07-19" }),
        ],
      ]),
    );

    const { UNSAFE_getByType } = renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    expect(screen.getAllByText("Read")).toHaveLength(2);
    // The note takes its own line - there is no timestamp column to compete
    // with, because `logged_on` is a date.
    expect(screen.getByText("Ten pages")).toBeTruthy();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("writes day headings as dates a person reads, never the raw key (#726)", () => {
    mockUseHabitLogPages.mockReturnValue(
      mockPages([
        [habitLog({ loggedOn: "2026-07-20" }), habitLog({ id: "l2", loggedOn: currentDateKey() })],
      ]),
    );

    renderWithProviders(<HabitsHistoryScreen />);

    // The screen used to pass `section.key` through a `{{date}}` passthrough, so
    // every heading read `2026-07-20` in both locales.
    expect(screen.queryByText("2026-07-20")).toBeNull();
    const expected = new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date("2026-07-20T12:00:00"));
    expect(screen.getByText(expected)).toBeTruthy();
    // Today keeps its word: it is a position, not a date.
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("shows the calm empty state only once a page has come back empty", () => {
    const { UNSAFE_getByType } = renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.getByText("Once you tick a habit, that day will appear here.")).toBeTruthy();
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("says nothing about emptiness while the first page is still in flight", () => {
    mockUseHabitLogPages.mockReturnValue(mockPages([], { isPending: true, data: undefined }));

    renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.queryByText("Once you tick a habit, that day will appear here.")).toBeNull();
    expect(screen.queryByText("Couldn't load your history")).toBeNull();
  });

  it("says the load failed rather than claiming the account is empty", () => {
    // A returning user with hundreds of ticks must never be told there is
    // nothing here because one request failed.
    mockUseHabitLogPages.mockReturnValue(mockPages([], { isError: true, data: undefined }));

    renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.getByText("Couldn't load your history")).toBeTruthy();
    expect(screen.queryByText("Once you tick a habit, that day will appear here.")).toBeNull();
  });

  it("names an archived habit's ticks, which is why history reads the archived list", () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ archivedAt: "2026-07-25T08:00:00.000Z", name: "Retired walk" })],
    } as unknown as ReturnType<typeof useHabits>);
    mockUseHabitLogPages.mockReturnValue(mockPages([[habitLog()]]));

    renderWithProviders(<HabitsHistoryScreen />);

    // A row that cannot name its habit renders as nothing at all.
    expect(screen.getByText("Retired walk")).toBeTruthy();
  });

  it("navigates to the habit detail when a row is pressed", () => {
    mockUseHabitLogPages.mockReturnValue(mockPages([[habitLog()]]));

    renderWithProviders(<HabitsHistoryScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Read" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]",
      params: { id: "h-1" },
    });
  });
});
