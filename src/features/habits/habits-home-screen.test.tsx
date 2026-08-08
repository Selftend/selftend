import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import HabitsHomeScreen from "./habits-home-screen";
import { habitChipColors } from "@/src/features/habits/habit-color";
import { useHabitLogs, useHabits, useToggleHabitLog } from "@/src/features/habits/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { addDays, currentDateKey, localDateKey } from "@/src/features/habits/scheduling";
import type { HabitLog } from "@/src/features/habits/types";
import {
  useUpdateShownButtonTours,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";
import { useSelectedDate } from "@/src/stores/selected-date-store";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/habits",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateShownButtonTours: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
  useHabitLogs: jest.fn(),
  useToggleHabitLog: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateShownButtonTours = useUpdateShownButtonTours as jest.MockedFunction<
  typeof useUpdateShownButtonTours
>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseHabits = useHabits as jest.MockedFunction<typeof useHabits>;
const mockUseHabitLogs = useHabitLogs as jest.MockedFunction<typeof useHabitLogs>;
const mockUseToggleHabitLog = useToggleHabitLog as jest.MockedFunction<typeof useToggleHabitLog>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

const toggleMutate = jest.fn();

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
  mockUseSelectedDate.mockReturnValue({
    selectedDate: currentDateKey(),
  });

  mockUseUserPreferences.mockReturnValue({
    data: { ...defaultUserPreferences, habitsOnboardingCompleted: true },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);

  mockUseUpdateUserPreferences.mockReturnValue({
    isPending: false,
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  mockUseUpdateShownButtonTours.mockReturnValue({
    isPending: false,
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useUpdateShownButtonTours>);

  mockUseHabits.mockReturnValue({
    data: [
      {
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
      },
    ],
    isLoading: false,
  } as unknown as ReturnType<typeof useHabits>);

  mockUseHabitLogs.mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useHabitLogs>);

  mockUseToggleHabitLog.mockReturnValue({
    isPending: false,
    mutate: toggleMutate,
  } as unknown as ReturnType<typeof useToggleHabitLog>);
}

describe("HabitsHomeScreen act room", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders the act field header with stats, and empty-state subline on the room pour", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByRole("heading", { name: "Habits" })).toBeTruthy();
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The root carries the act room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
    // Both existing stats and the author credit migrate onto the field.
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText("1 active habit")).toBeTruthy();
    // Book credits were scrubbed app-wide (#494).
    expect(screen.queryByText(/Inspired by/)).toBeNull();
    // Calm muted subline when nothing is ticked - never a shame state.
    expect(screen.getByText("No ticks yet")).toBeTruthy();
  });

  it("shows the relative last-tick subline when a tick exists", async () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("Last tick · Today")).toBeTruthy();
    expect(screen.queryByText("No ticks yet")).toBeNull();
  });

  it("derives the subline from lifetime history when the latest tick is older than the 30-day window", async () => {
    const oldDate = localDateKey(addDays(new Date(), -45));
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 1 ? [habitLog({ loggedOn: oldDate })] : [],
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("Last tick · 45 days ago")).toBeTruthy();
    expect(screen.queryByText("No ticks yet")).toBeNull();
  });

  it("omits the subline until the lifetime tick query has actually loaded", async () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no ticks yet" there would erase a returning user's real history.
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 1 ? undefined : [],
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByRole("heading", { name: "Habits" })).toBeTruthy();
    expect(screen.queryByText("No ticks yet")).toBeNull();
    expect(screen.queryByText(/^Last tick · /)).toBeNull();
  });
});

describe("HabitsHomeScreen tap-to-tick", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("calls toggleHabitLog with the selected date when the tick is pressed", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    const tickButton = await screen.findByRole("checkbox", {
      name: /Tap to tick today/i,
    });

    fireEvent.press(tickButton);

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: currentDateKey(),
      });
    });
  });

  it("calls toggleHabitLog with a past selectedDate when a non-today date is active", async () => {
    const pastDate = "2026-05-20";
    mockUseSelectedDate.mockReturnValue({ selectedDate: pastDate });

    renderWithProviders(<HabitsHomeScreen />);

    const tickButton = await screen.findByRole("checkbox", {
      name: /Tap to tick today/i,
    });

    fireEvent.press(tickButton);

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: pastDate,
      });
    });
  });
});

describe("HabitsHomeScreen ticked-state contrast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("outlines a ticked habit in chip ink, not the soft resting border", async () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    const tickBox = await screen.findByRole("checkbox", { name: /Ticked today/i });
    const style = StyleSheet.flatten(tickBox.props.style) as {
      backgroundColor?: string;
      borderColor?: string;
    };
    const chip = habitChipColors("primary", "light");

    expect(style.backgroundColor).toBe(chip.fill);
    // The week strip encodes ticked by color alone - no label, no glyph - so
    // its outline has to be the stop certified against the room surface
    // (test/chip-contrast.test.ts), not the decorative `border`.
    expect(style.borderColor).toBe(chip.ink);
    expect(style.borderColor).not.toBe(chip.border);
  });
});
