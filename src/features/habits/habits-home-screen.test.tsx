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

    expect(await screen.findByText("last ticked Today")).toBeTruthy();
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

    expect(await screen.findByText("last ticked 45 days ago")).toBeTruthy();
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
    expect(screen.queryByText(/^last ticked /)).toBeNull();
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

function habit(overrides: Record<string, unknown> = {}) {
  return {
    id: "h-1",
    userId: "user-1",
    name: "Read",
    kind: "build",
    identity: "",
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

// 2026-08-08 is a Saturday and 2026-08-07 the Friday before it, so a
// weekdays-only habit is off-cadence on the first and due on the second.
const SATURDAY = "2026-08-08";
const FRIDAY = "2026-08-07";

describe("HabitsHomeScreen lists every habit every day", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
    mockUseSelectedDate.mockReturnValue({ selectedDate: SATURDAY });
  });

  it("shows a weekdays-only habit on a Saturday instead of an empty tool", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ cadence: "weekdays", name: "Read" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    // The list used to filter by cadence, so this user's whole tool read as
    // empty on their rest days.
    expect(await screen.findByText("Read")).toBeTruthy();
    expect(screen.queryByText(/No habits scheduled/i)).toBeNull();
  });

  it("keeps the tick enabled off-cadence, because doing it anyway is a good outcome", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ cadence: "weekdays" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    const tick = await screen.findByRole("checkbox", { name: /Read: tap to tick today/i });
    fireEvent.press(tick);

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({ habitId: "h-1", loggedOn: SATURDAY });
    });
  });

  it("separates not-due from due-not-done by border style, not by colour alone", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ cadence: "weekdays" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    // `includeHiddenElements` is required precisely because the cells are
    // hidden from the a11y tree - asserted on its own below.
    const notDue = await screen.findByTestId(`week-cell-h-1-${SATURDAY}`, {
      includeHiddenElements: true,
    });
    const dueNotDone = screen.getByTestId(`week-cell-h-1-${FRIDAY}`, {
      includeHiddenElements: true,
    });

    // Dashed vs solid survives greyscale and every CVD; a colour-only
    // difference would render "never due" as "due and not done" - the
    // accusation the guardrails forbid. NativeWind leaves `className` on the
    // host view under jest rather than resolving it, so the class IS the
    // observable here.
    expect(notDue.props.className).toContain("border-dashed");
    expect(dueNotDone.props.className).not.toContain("border-dashed");
    expect(dueNotDone.props.className).toContain("bg-muted/40");
  });

  it("hides the strip's cells behind one text equivalent", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ cadence: "weekdays" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ loggedOn: FRIDAY })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    // Seven unlabelled decorative boxes are worse than useless to a screen
    // reader; the strip announces its record once instead.
    expect(await screen.findByLabelText("Last 7 days: ticked on 1 day")).toBeTruthy();
    // And the cells themselves are out of the a11y tree entirely.
    expect(screen.queryByTestId(`week-cell-h-1-${FRIDAY}`)).toBeNull();
  });
});

describe("HabitsHomeScreen before the logs window answers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("will not toggle against an unread cache, which deletes rather than creates", async () => {
    // `undefined` is in-flight or failed-with-no-cache, NOT "no ticks". The
    // habits query gates the screen but the logs query resolves separately, so
    // a row can render unticked while a tick - and its note - already exists.
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 1 ? [] : undefined,
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    const tick = await screen.findByRole("checkbox", { name: /Read: tap to tick today/i });
    fireEvent.press(tick);

    expect(toggleMutate).not.toHaveBeenCalled();
  });

  it("allows ticking once the window has answered, even empty", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByRole("checkbox", { name: /Read: tap to tick today/i }));

    await waitFor(() => expect(toggleMutate).toHaveBeenCalled());
  });
});

describe("HabitsHomeScreen tick labelling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("names the habit in the tick's accessible name, so two habits differ", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ id: "h-1", name: "Read" }), habit({ id: "h-2", name: "Walk" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    // Every tick used to announce "Tap to tick today" and nothing else (#724).
    expect(await screen.findByRole("checkbox", { name: "Read: tap to tick today" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Walk: tap to tick today" })).toBeTruthy();
  });
});

describe("HabitsHomeScreen unticking a day that holds a note", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("confirms first, because the note is the same row as the tick", async () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "Felt good after." })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByRole("checkbox", { name: /Read: ticked today/i }));

    expect(toggleMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Remove tick and note")).toBeTruthy();

    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: currentDateKey(),
      });
    });
  });

  it("unticks an empty day immediately - the common case asks nothing", async () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ note: "" })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByRole("checkbox", { name: /Read: ticked today/i }));

    await waitFor(() => {
      expect(toggleMutate).toHaveBeenCalledWith({
        habitId: "h-1",
        loggedOn: currentDateKey(),
      });
    });
    expect(screen.queryByText("Remove tick and note")).toBeNull();
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
