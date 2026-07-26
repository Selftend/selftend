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
import { currentDateKey } from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

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

describe("HabitDetailScreen act room", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders the loaded habit inside the act room - no field gradient", () => {
    const { UNSAFE_getByType } = renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy();
    expect(screen.getByText("I'm a reader")).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expect(UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("act").light);
  });

  it("pours the act room on the loading state", () => {
    mockUseHabit.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useHabit>);

    const { UNSAFE_getByType } = renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("act").light);
  });

  it("pours the act room on the not-found state", () => {
    mockUseHabit.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useHabit>);

    const { UNSAFE_getByType } = renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("We couldn't find that habit.")).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(UNSAFE_getByType(SafeAreaView).props.style).toEqual(roomVariables("act").light);
  });
});

describe("HabitDetailScreen content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders schedule, kind, and populated strategies", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Every day")).toBeTruthy();
    expect(screen.getByText("Build")).toBeTruthy();
    expect(screen.getByText("Two-minute version")).toBeTruthy();
    expect(screen.getByText("Read one page")).toBeTruthy();
    // Empty strategy slots stay hidden.
    expect(screen.queryByText("Cue")).toBeNull();
  });

  it("shows the archived badge and restore action for an archived habit", () => {
    mockUseHabit.mockReturnValue({
      data: habit({ archivedAt: "2026-06-01T08:00:00.000Z" }),
      isLoading: false,
    } as unknown as ReturnType<typeof useHabit>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Archived")).toBeTruthy();
    expect(screen.getByText("Restore")).toBeTruthy();
    expect(screen.queryByText("Archive")).toBeNull();
  });

  it("renders recent notes from logs and the empty state without them", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Felt easy today", loggedOn: "2026-07-20" })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.getByText("Felt easy today")).toBeTruthy();
    expect(screen.getByText("2026-07-20")).toBeTruthy();
    expect(screen.queryByText("Notes you save with a tick will appear here.")).toBeNull();
  });
});

describe("HabitDetailScreen behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("toggles a calendar day tick for today", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    const today = currentDateKey();
    fireEvent.press(screen.getByRole("checkbox", { name: today }));

    expect(toggleMutate).toHaveBeenCalledWith({ habitId: "h-1", loggedOn: today });
  });

  it("navigates to edit and add-note", () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    fireEvent.press(screen.getByText("Edit"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]/edit",
      params: { id: "h-1" },
    });

    fireEvent.press(screen.getByText("Add note"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]/log",
      params: { id: "h-1" },
    });
  });

  it("archives the habit through the confirm dialog", async () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.queryByText("Archive habit?")).toBeNull();
    fireEvent.press(screen.getByText("Archive"));
    expect(screen.getByText("Archive habit?")).toBeTruthy();

    // Two "Archive" texts now: the action row button and the dialog confirm.
    const confirmButtons = screen.getAllByText("Archive");
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(archiveMutateAsync).toHaveBeenCalledWith("h-1");
    });
  });

  it("deletes the habit through the confirm dialog and returns home", async () => {
    renderWithProviders(<HabitDetailScreen habitId="h-1" />);

    expect(screen.queryByText("Delete habit?")).toBeNull();
    fireEvent.press(screen.getByText("Delete"));
    expect(screen.getByText("Delete habit?")).toBeTruthy();

    const confirmButtons = screen.getAllByText("Delete");
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith("h-1");
    });
    expect(router.replace).toHaveBeenCalledWith("/tools/habits");
  });
});
