import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

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

// Stubbed to its contract - `visible` in, `onComplete` out. The real shell is a
// four-step wizard with its own tests; driving it here would test the wizard's
// step order rather than what this screen does when it finishes.
jest.mock("@/src/components/app/habits-onboarding-modal", () => {
  const React = jest.requireActual("react");
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    HabitsOnboarding: ({ visible, onComplete }: { visible: boolean; onComplete: () => void }) =>
      visible
        ? React.createElement(
            Pressable,
            { testID: "onboarding-complete", onPress: onComplete },
            React.createElement(Text, null, "complete onboarding"),
          )
        : null,
  };
});

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
    expect(screen.getByText("no ticks yet")).toBeTruthy();
  });

  it("shows the relative last-tick subline when a tick exists", async () => {
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog()],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("last ticked Today")).toBeTruthy();
    expect(screen.queryByText("no ticks yet")).toBeNull();
  });

  it("derives the subline from lifetime history when the latest tick is older than the 30-day window", async () => {
    const oldDate = localDateKey(addDays(new Date(), -45));
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 5 ? [habitLog({ loggedOn: oldDate })] : [],
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("last ticked 45 days ago")).toBeTruthy();
    expect(screen.queryByText("no ticks yet")).toBeNull();
  });

  it("omits the subline until the lifetime tick query has actually loaded", async () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no ticks yet" there would erase a returning user's real history.
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 5 ? undefined : [],
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByRole("heading", { name: "Habits" })).toBeTruthy();
    expect(screen.queryByText("no ticks yet")).toBeNull();
    expect(screen.queryByText(/^last ticked /)).toBeNull();
  });
});

describe("HabitsHomeScreen recent activity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("agrees with the last-tick line instead of the 30-day window", async () => {
    const oldDate = localDateKey(addDays(new Date(), -45));
    // The recent list used to read the 30-day window, so a user returning after
    // a month saw "Ticks you make will appear here" directly under
    // "last ticked 45 days ago" (#762).
    mockUseHabitLogs.mockImplementation(
      (_userId, options) =>
        ({
          data: options?.limit === 5 ? [habitLog({ loggedOn: oldDate })] : [],
        }) as unknown as ReturnType<typeof useHabitLogs>,
    );

    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("last ticked 45 days ago")).toBeTruthy();
    expect(screen.queryByText("Ticks you make will appear here.")).toBeNull();
  });

  it("puts one link out beside the list rather than in the CTA row", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByRole("link", { name: /View history/i }));

    expect(jest.mocked(router).push).toHaveBeenCalledWith("/tools/habits/history");
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
          data: options?.limit === 5 ? [] : undefined,
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

// A Monday inside the four-week rhythm window ending on SATURDAY.
const MONDAY = "2026-08-03";

describe("HabitsHomeScreen weekly rhythm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
    mockUseSelectedDate.mockReturnValue({ selectedDate: SATURDAY });
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ loggedOn: MONDAY })],
    } as unknown as ReturnType<typeof useHabitLogs>);
  });

  it("ships one insight, and neither of the two that measured the user", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByRole("heading", { name: "Weekly rhythm" })).toBeTruthy();
    // Two-minute adoption was a completeness meter for an optional form field;
    // the identity round-up ranked the user's own self-descriptions against
    // each other, and blanked for everyone on the 1st of the month (#712).
    expect(screen.queryByText("Two-minute floor")).toBeNull();
    expect(screen.queryByText("Identities this month")).toBeNull();
    // And the wrapper heading goes with them - one insight does not need a
    // section called "Insights" containing a heading called "Weekly rhythm".
    expect(screen.queryByRole("heading", { name: "Insights" })).toBeNull();
  });

  it("states no rate, because a denominator encodes what the user should have done", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    await screen.findByRole("heading", { name: "Weekly rhythm" });
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/\d+ of \d+/)).toBeNull();
  });

  it("orders the week Monday-first, matching the detail grid", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    await screen.findByRole("heading", { name: "Weekly rhythm" });
    const labels = screen
      .getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
      .map((node) => node.props.children);

    // `getWeeklyRhythm` returns [Sun..Sat] because that is `Date.getDay`; a
    // Sunday-first row splits the weekend across both ends, so a weekdays habit
    // reads as two dips rather than one (#713).
    expect(labels).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("puts the count above its own bar", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    await screen.findByRole("heading", { name: "Weekly rhythm" });
    // One tick, on the Monday - so six columns read zero and one reads one.
    expect(within(screen.getByLabelText("Mon: 1 tick")).getByText("1")).toBeTruthy();
    for (const weekday of ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(within(screen.getByLabelText(`${weekday}: 0 ticks`)).getByText("0")).toBeTruthy();
    }
  });

  it("fills bars with the accessible neutral rather than the 1.10:1 wash", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    await screen.findByRole("heading", { name: "Weekly rhythm" });
    const bars = screen.getAllByTestId("bar-chart-bar");

    expect(bars).toHaveLength(7);
    for (const bar of bars) {
      // `bg-muted` on `bg-card` is not low-contrast, it is invisible (#725).
      expect(bar.props.className).not.toMatch(/(?:^|\s)bg-muted(?:\s|$)/);
      expect(bar.props.className).toContain("bg-muted-foreground/80");
    }
  });

  it("pairs each count with its weekday for a screen reader", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    // Without this the count above and the weekday below arrive as two
    // unrelated strings to be paired by position (#737).
    expect(await screen.findByLabelText("Mon: 1 tick")).toBeTruthy();
    expect(screen.getByLabelText("Tue: 0 ticks")).toBeTruthy();
  });
});

describe("HabitsHomeScreen omissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("gives Learn one front door instead of rotating a card at the overview", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByTestId("habits-learn-row"));

    expect(jest.mocked(router).push).toHaveBeenCalledWith("/tools/habits/learn");
    // The rotating card advertised a section nothing linked to, and its only
    // control cycled the advert (#765).
    expect(screen.queryByLabelText("Next card")).toBeNull();
  });

  it("retires the identity banner", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ identity: "I'm a reader" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    await screen.findByText("Read");
    // It rotated one of the user's own identity strings into the screen's most
    // prominent sentence, on a day-of-month rule nobody could see.
    expect(screen.queryByText(/becoming someone who/i)).toBeNull();
  });
});

describe("HabitsHomeScreen onboarding completion", () => {
  const updateMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
    updateMutateAsync.mockResolvedValue(undefined);
    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("records completion, now that the route that used to do it is gone", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    // The `info` action is the only remaining way in, now the route is gone (#765).
    fireEvent.press(await screen.findByLabelText(/about/i));
    fireEvent.press(await screen.findByTestId("onboarding-complete"));

    // A patch, not a whole-row merge: the mutation writes only the columns it
    // is given, and a full write clobbers concurrent writers (#57).
    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({ habitsOnboardingCompleted: true });
    });
  });
});

describe("HabitsHomeScreen never miss twice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
  });

  it("renders one line, above the tick list, when the condition holds", async () => {
    mockUseHabits.mockReturnValue({
      data: [habit({ name: "Floss" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);

    renderWithProviders(<HabitsHomeScreen />);

    expect(
      await screen.findByText("Never miss twice: 1 habit wasn't ticked yesterday."),
    ).toBeTruthy();

    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf("Never miss twice")).toBeLessThan(tree.indexOf("Floss"));

    // The old body instructed the user and then congratulated the product:
    // "Today is a great day to tick this once - one missed day is data, not
    // failure" (#711).
    expect(screen.queryByText(/not failure/i)).toBeNull();
    expect(screen.queryByText(/great day/i)).toBeNull();
  });

  it("says nothing at all when yesterday was ticked", async () => {
    const yesterday = localDateKey(addDays(new Date(), -1));
    mockUseHabitLogs.mockReturnValue({
      data: [habitLog({ loggedOn: yesterday })],
    } as unknown as ReturnType<typeof useHabitLogs>);

    renderWithProviders(<HabitsHomeScreen />);

    // Not `findByText("Read")` - yesterday's tick also puts the habit in the
    // recent-activity list, so the name is on the screen twice.
    await screen.findByRole("checkbox", { name: /Read: tap to tick today/i });
    // A conditional trigger that fired every day would be ambient copy, which
    // is exactly what it was kept instead of (#709).
    expect(screen.queryByText(/Never miss twice/i)).toBeNull();
  });
});

describe("HabitsHomeScreen archived habits", () => {
  const archived = habit({
    id: "h-archived",
    name: "Old habit",
    archivedAt: "2026-06-01T08:00:00.000Z",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaults();
    mockUseHabits.mockReturnValue({
      data: [habit({ id: "h-1", name: "Read" }), archived],
      isLoading: false,
    } as unknown as ReturnType<typeof useHabits>);
  });

  it("keeps them out of the tick list, and out of the tree until asked for", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    expect(await screen.findByText("Read")).toBeTruthy();
    // Archiving is how a user puts a habit down; a put-down habit reappearing
    // in tomorrow's list would undo the gesture.
    expect(screen.queryByText("Old habit")).toBeNull();
    expect(screen.getByText("Archived (1)")).toBeTruthy();
  });

  it("reaches a never-ticked archived habit, which nothing else could (#723)", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    // History lists *logs*, so a habit archived before it was ever ticked had
    // no row anywhere and no route to its own detail screen.
    fireEvent.press(await screen.findByTestId("habits-archived-group"));

    fireEvent.press(screen.getByLabelText("Old habit: open habit details"));

    expect(jest.mocked(router).push).toHaveBeenCalledWith({
      pathname: "/tools/habits/[id]",
      params: { id: "h-archived" },
    });
  });

  it("offers no tick control on an archived habit", async () => {
    renderWithProviders(<HabitsHomeScreen />);

    fireEvent.press(await screen.findByTestId("habits-archived-group"));

    // Reachable, not resumable in place.
    expect(screen.queryByRole("checkbox", { name: /Old habit/i })).toBeNull();
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
