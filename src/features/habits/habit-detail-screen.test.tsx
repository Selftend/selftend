import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import { HabitDetailScreen } from "@/src/features/habits/habit-detail-screen";
import {
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitLogs,
  useRestoreHabit,
  useToggleHabitLog,
} from "@/src/features/habits/queries";
import { currentDateKey, localDateKey } from "@/src/features/habits/scheduling";
import { tickGridStartKey } from "@/src/features/habits/tick-grid";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits/h-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useArchiveHabit: jest.fn(),
  useDeleteHabit: jest.fn(),
  useHabit: jest.fn(),
  useHabitLogs: jest.fn(),
  useRestoreHabit: jest.fn(),
  useToggleHabitLog: jest.fn(),
}));

const mockUseHabit = useHabit as jest.MockedFunction<typeof useHabit>;
const mockUseHabitLogs = useHabitLogs as jest.MockedFunction<typeof useHabitLogs>;
const mockUseToggleHabitLog = useToggleHabitLog as jest.MockedFunction<typeof useToggleHabitLog>;
const mockUseArchiveHabit = useArchiveHabit as jest.MockedFunction<typeof useArchiveHabit>;
const mockUseRestoreHabit = useRestoreHabit as jest.MockedFunction<typeof useRestoreHabit>;
const mockUseDeleteHabit = useDeleteHabit as jest.MockedFunction<typeof useDeleteHabit>;

const toggleMutate = jest.fn();
const archiveMutateAsync = jest.fn();
const restoreMutateAsync = jest.fn();
const deleteMutateAsync = jest.fn();

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
    twoMinuteVersion: "Read one page",
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
    loggedOn: currentDateKey(),
    note: "",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    ...overrides,
  };
}

function longDate(dayKey: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dayKey}T12:00:00`));
}

/** The shape a note row's date column takes once it is older than yesterday. */
function noteDate(dayKey: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dayKey}T12:00:00`));
}

/** `count` days before today, as a day key. Keeps the fixtures date-agnostic. */
function daysAgo(count: number): string {
  const day = new Date(`${currentDateKey()}T12:00:00`);
  day.setDate(day.getDate() - count);
  return localDateKey(day);
}

function mockDefaults() {
  mockUseHabit.mockReturnValue({
    data: habit(),
    isLoading: false,
  } as unknown as ReturnType<typeof useHabit>);
  mockUseHabitLogs.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useHabitLogs>);
  mockUseToggleHabitLog.mockReturnValue({
    isPending: false,
    mutate: toggleMutate,
  } as unknown as ReturnType<typeof useToggleHabitLog>);
  mockUseArchiveHabit.mockReturnValue({
    isPending: false,
    mutateAsync: archiveMutateAsync.mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useArchiveHabit>);
  mockUseRestoreHabit.mockReturnValue({
    isPending: false,
    mutateAsync: restoreMutateAsync.mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useRestoreHabit>);
  mockUseDeleteHabit.mockReturnValue({
    isPending: false,
    mutateAsync: deleteMutateAsync.mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useDeleteHabit>);
}

describe("HabitDetailScreen twelve-week grid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("fetches exactly the window it draws, opening on a Monday", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    const startKey = tickGridStartKey(currentDateKey());
    expect(new Date(`${startKey}T12:00:00`).getDay()).toBe(1);
    expect(mockUseHabitLogs).toHaveBeenCalledWith("user-1", {
      habitId: "h-1",
      sinceDate: startKey,
    });
  });

  it("draws every past day of the window as a control, and no future day at all", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    const cells = screen.getAllByRole("checkbox");
    const today = currentDateKey();
    const start = new Date(`${tickGridStartKey(today)}T12:00:00`);
    const elapsed = Math.round(
      (new Date(`${today}T12:00:00`).getTime() - start.getTime()) / 86_400_000,
    );
    // Every day from the window's Monday through today, plus the standalone
    // "Tick today" button - and nothing for the days still ahead.
    expect(cells).toHaveLength(elapsed + 1 + 1);
  });

  it("ticks a past day through its own cell, announced as a human date", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    const startKey = tickGridStartKey(currentDateKey());
    // Screen readers should never hear the raw "YYYY-MM-DD" day key.
    expect(screen.queryByRole("checkbox", { name: startKey })).toBeNull();
    fireEvent.press(screen.getByRole("checkbox", { name: longDate(startKey) }));

    expect(toggleMutate).toHaveBeenCalledWith({ habitId: "h-1", loggedOn: startKey });
  });

  it("counts the window's ticks with no denominator anywhere", () => {
    const startKey = tickGridStartKey(currentDateKey());
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ id: "a" }), habitLog({ id: "b", loggedOn: startKey })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("2 ticks")).toBeTruthy();
    // A ratio encodes what the user should have done (#713).
    expect(screen.queryByText(/of \d+ days/)).toBeNull();
  });

  it("refuses to tick while the logs query is still unanswered", () => {
    mockUseHabitLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    // A press against an unread cache would DELETE the server's row, note and
    // all, past the confirmation that exists to prevent that.
    fireEvent.press(screen.getByRole("checkbox", { name: longDate(currentDateKey()) }));
    expect(toggleMutate).not.toHaveBeenCalled();
  });
});

describe("HabitDetailScreen tick today", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("offers a full-size control for today and ticks through it", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByRole("checkbox", { name: "Tick today" }));

    expect(toggleMutate).toHaveBeenCalledWith({ habitId: "h-1", loggedOn: currentDateKey() });
  });

  it("reads as done once today is ticked, and names the undo action (#932)", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByRole("checkbox", { name: "Ticked today · Undo" })).toBeTruthy();
  });

  it("confirms before an untick that would delete a note, and not otherwise", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Two chapters" })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByRole("checkbox", { name: "Ticked today · Undo" }));
    expect(toggleMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Remove this tick?")).toBeTruthy();

    fireEvent.press(screen.getByText("Remove tick and note"));
    expect(toggleMutate).toHaveBeenCalledWith({ habitId: "h-1", loggedOn: currentDateKey() });
  });
});

describe("HabitDetailScreen notes with ticks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders a translated date, never the raw ISO key (#726)", () => {
    const day = daysAgo(20);
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Felt easy today", loggedOn: day })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Felt easy today")).toBeTruthy();
    expect(screen.queryByText(day)).toBeNull();
    expect(screen.getByText(noteDate(day))).toBeTruthy();
  });

  it("opens the day's editor from a note row, and today's from the header", () => {
    const day = daysAgo(20);
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Felt easy today", loggedOn: day })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByText("Felt easy today"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]/log",
      params: { id: "h-1", date: day },
    });

    fireEvent.press(screen.getByText("Add note"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]/log",
      params: { id: "h-1", date: currentDateKey() },
    });
  });

  /**
   * The object-form href is the shape worth pinning at a real call site
   * (#1267): `forPathname` must arrive with the dynamic segment substituted and
   * the non-segment `date` param left OFF. The router serialises leftover
   * params into the query string, which `usePathname()` never reports - so a
   * recorded target that kept them could never match on arrival, and the
   * failure would be silent: the log screen just quietly showing Up.
   *
   * ⚠️ On the STORE, not on `router.push`: `usePushWithOrigin` pushes through
   * `router.push`, so the assertion above passes identically whether or not
   * this call site was ever migrated.
   */
  it("records the detail screen as the Origin for the note editor, params off", () => {
    useNavigationOriginStore.setState({ pending: null });
    const day = daysAgo(20);
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Felt easy today", loggedOn: day })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);
    fireEvent.press(screen.getByText("Felt easy today"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/tools/habits/h-1",
      forPathname: "/tools/habits/h-1/log",
    });
  });

  it("shows the empty state when no tick carries a note", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Notes you save with a tick will appear here.")).toBeTruthy();
  });
});

describe("HabitDetailScreen detail rows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("shows the stack row whenever the habit holds one, build or break (#760)", () => {
    mockUseHabit.mockReturnValue({
      data: habit({ kind: "break", stackAfter: "After coffee" }),
      isLoading: false,
    } as unknown as ReturnType<typeof useHabit>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Habit stack")).toBeTruthy();
    expect(screen.getByText("After coffee")).toBeTruthy();
  });

  it("omits the row when the habit holds no stack", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.queryByText("Habit stack")).toBeNull();
  });

  it("renders populated prompts as labelled rows and hides the empty ones", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Two-minute version")).toBeTruthy();
    expect(screen.getByText("Read one page")).toBeTruthy();
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("I'm a reader")).toBeTruthy();
    expect(screen.queryByText("Cue")).toBeNull();
  });

  it("folds schedule, kind and start date into one subline", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    const started = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date("2026-05-01T08:00:00.000Z"));
    expect(screen.getByText(`Every day · Build · started ${started}`)).toBeTruthy();
  });
});

describe("HabitDetailScreen act room", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders the loaded habit inside the act room", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy();
    // The room moved from the SafeAreaView to a wrapper, so the top bar's
    // `bg-card` re-resolves through it too; a wrong or missing room fails here.
    expectNeutralRoom(screen.getByTestId("habit-detail-room"));
  });

  it("pours the act room on the loading state", () => {
    mockUseHabit.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useHabit>);

    const { UNSAFE_getByType } = renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("pours the act room on the not-found state", () => {
    mockUseHabit.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useHabit>);

    const { UNSAFE_getByType } = renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("We couldn't find that habit.")).toBeTruthy();
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });
});

describe("HabitDetailScreen overflow menu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("keeps archive and delete out of the action row", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    // Both live behind `more_horiz` now, so a destructive action no longer
    // carries the same weight as opening the editor (#709).
    expect(screen.queryByText("Archive")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.getByLabelText("More actions")).toBeTruthy();
  });

  it("archives the habit through the menu and its confirm dialog", async () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByLabelText("More actions"));
    fireEvent.press(await screen.findByText("Archive"));
    expect(screen.getByText("Archive habit?")).toBeTruthy();

    const confirmButtons = screen.getAllByText("Archive");
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(archiveMutateAsync).toHaveBeenCalledWith("h-1");
    });
  });

  it("offers Restore instead of Archive for an archived habit", async () => {
    mockUseHabit.mockReturnValue({
      data: habit({ archivedAt: "2026-06-01T08:00:00.000Z" }),
      isLoading: false,
    } as unknown as ReturnType<typeof useHabit>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Archived")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("More actions"));
    expect(await screen.findByText("Restore")).toBeTruthy();
    expect(screen.queryByText("Archive")).toBeNull();
  });

  it("deletes the habit through the menu and returns home", async () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByLabelText("More actions"));
    fireEvent.press(await screen.findByText("Delete"));
    expect(screen.getByText("Delete habit?")).toBeTruthy();

    const confirmButtons = screen.getAllByText("Delete");
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith("h-1");
    });
    expect(router.replace).toHaveBeenCalledWith("/tools/habits");
  });

  it("navigates to edit from the icon button", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByLabelText("Edit"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]/edit",
      params: { id: "h-1" },
    });
  });
});
