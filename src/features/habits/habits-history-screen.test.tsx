import { fireEvent, screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import HabitsHistoryScreen from "@/src/features/habits/habits-history-screen";
import { useHabitLogs, useHabits } from "@/src/features/habits/queries";
import type { Habit, HabitLog } from "@/src/features/habits/types";
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
  useHabitLogs: jest.fn(),
}));

const mockUseHabits = useHabits as jest.MockedFunction<typeof useHabits>;
const mockUseHabitLogs = useHabitLogs as jest.MockedFunction<typeof useHabitLogs>;

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

function mockDefaults() {
  mockUseHabits.mockReturnValue({
    data: [habit()],
  } as unknown as ReturnType<typeof useHabits>);
  mockUseHabitLogs.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useHabitLogs>);
}

describe("HabitsHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders grouped logs inside the act room - no field gradient", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [
        habitLog({ id: "log-1", loggedOn: "2026-07-20", note: "Ten pages" }),
        habitLog({ id: "log-2", loggedOn: "2026-07-19" }),
      ],
    } as unknown as ReturnType<typeof useHabitLogs>);

    const { UNSAFE_getByType } = renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    // One date group header per day, newest first, each with the habit's row.
    expect(screen.getByText("2026-07-20")).toBeTruthy();
    expect(screen.getByText("2026-07-19")).toBeTruthy();
    expect(screen.getAllByText("Read")).toHaveLength(2);
    expect(screen.getByText("Ten pages")).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("shows the calm empty state on the room pour when no ticks exist", () => {
    const { UNSAFE_getByType } = renderWithProviders(<HabitsHistoryScreen />);

    expect(screen.getByText("Once you tick a habit, that day will appear here.")).toBeTruthy();
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("navigates to the habit detail when a row is pressed", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHistoryScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Read" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]",
      params: { id: "h-1" },
    });
  });
});
