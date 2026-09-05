import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import RoutinesHomeScreen from "./routines-home-screen";
import { STEPPABLE_TOOL_IDS, type RoutineToolRecords } from "@/src/features/routines/derive";
import { useAddStep, useCreateRoutine, useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { renderWithProviders } from "@/test/render-with-providers";
import { currentDateKey, lastNDayKeys } from "@/src/utils/date";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/routines",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
  useCreateRoutine: jest.fn(),
  useAddStep: jest.fn(),
  useDeleteRoutine: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseCreateRoutine = useCreateRoutine as jest.MockedFunction<typeof useCreateRoutine>;
const mockUseAddStep = useAddStep as jest.MockedFunction<typeof useAddStep>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;

/** Every steppable slice fetched and empty; overrides add the records a scenario needs. */
function readyRecords(overrides: Partial<RoutineToolRecords> = {}): RoutineToolRecords {
  return {
    moodLogs: [],
    journalEntries: [],
    gratitudeEntries: [],
    sleepLogs: [],
    thoughtRecords: [],
    mindfulnessSessions: [],
    meditationSessions: [],
    habitLogs: [],
    activityLogs: [],
    exposureSessions: [],
    defusionLogs: [],
    expansionLogs: [],
    urgeSurfLogs: [],
    connectionLogs: [],
    observingSelfSessions: [],
    bullsEyeSnapshots: [],
    choicePoints: [],
    committedActions: [],
    actionSteps: [],
    ...overrides,
  };
}

function makeRoutine(
  id: string,
  name: string,
  toolIds: readonly ("mood" | "journal")[],
  schedule?: Pick<RoutineWithSteps, "cadence" | "customDays">,
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled: false,
    reminderHour: null,
    reminderMinute: null,
    reminderTimezone: null,
    cadence: schedule?.cadence ?? "daily",
    customDays: schedule?.customDays ?? [],
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    steps: toolIds.map((toolId, index) => ({
      id: `${id}-step-${index}`,
      routineId: id,
      userId: "user-1",
      toolId,
      position: index,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    })),
  };
}

describe("RoutinesHomeScreen", () => {
  const createRoutine = jest.fn();
  const addStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRoutines.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
      typeof useRoutines
    >);
    mockUseCreateRoutine.mockReturnValue({
      mutateAsync: createRoutine,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateRoutine>);
    mockUseAddStep.mockReturnValue({
      mutateAsync: addStep,
      isPending: false,
    } as unknown as ReturnType<typeof useAddStep>);
    mockUseRoutineToolRecords.mockReturnValue({});
    createRoutine.mockResolvedValue({ id: "r-new" });
    addStep.mockResolvedValue({ id: "s-new" });
  });

  it("renders a card per routine with today's derived status", () => {
    mockUseRoutines.mockReturnValue({
      data: [
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Evening wind-down", ["journal"]),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    // A mood log today completes r-1's only step; r-2 has no journal entry.
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.getByText("Morning reset")).toBeTruthy();
    expect(screen.getByText("Done for today")).toBeTruthy();
    expect(screen.getByText("Evening wind-down")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
  });

  it("renders a last-7-days strip per card, filled only on complete days", () => {
    mockUseRoutines.mockReturnValue({
      data: [makeRoutine("r-1", "Morning reset", ["mood"])],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    // Mood logged yesterday (day -1) and three days ago (day -3), not today.
    const dayKeys = lastNDayKeys(7);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: dayKeys[5] }, { dayKey: dayKeys[3] }],
    });

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.getByText("Last 7 days")).toBeTruthy();
    expect(screen.getAllByLabelText(/: routine complete$/)).toHaveLength(2);
    // The five gap days render as neutral "not completed" cells; there is no
    // streak counter anywhere on the card (the only "streak" text on this
    // screen is the subtitle's "no streaks" promise).
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(5);
    expect(screen.queryByText(/\d+.?(day|week) streak/i)).toBeNull();
  });

  it("shows a calm schedule label for on-demand routines while daily cards keep their status", () => {
    mockUseRoutines.mockReturnValue({
      data: [
        makeRoutine("r-1", "Morning reset", ["journal"]),
        makeRoutine("r-2", "Deep clean", ["mood"], { cadence: "on-demand", customDays: [] }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);

    renderWithProviders(<RoutinesHomeScreen />);

    // The daily routine is unaffected; only the on-demand card swaps its line.
    expect(screen.getAllByText("Not started")).toHaveLength(1);
    expect(screen.getByText("On demand")).toBeTruthy();
  });

  it("shows the custom day list on a custom routine's off-day", () => {
    // Scheduled on two weekdays that are both NOT today, so today is an
    // off-day regardless of when the test runs.
    const today = new Date().getDay();
    const customDays = [(today + 1) % 7, (today + 3) % 7];
    mockUseRoutines.mockReturnValue({
      data: [makeRoutine("r-1", "Stretch", ["mood"], { cadence: "custom", customDays })],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);

    renderWithProviders(<RoutinesHomeScreen />);

    const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayList = [...customDays]
      .sort((a, b) => a - b)
      .map((d) => shortNames[d])
      .join(", ");
    expect(screen.getByText(`Runs ${dayList}`)).toBeTruthy();
    expect(screen.queryByText("Not started")).toBeNull();
  });

  it("hides the zero-progress badge on a resting card", () => {
    mockUseRoutines.mockReturnValue({
      data: [
        makeRoutine("r-1", "Deep clean", ["mood", "journal"], {
          cadence: "on-demand",
          customDays: [],
        }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);

    renderWithProviders(<RoutinesHomeScreen />);

    // Nothing was expected today, so no "0/2 today" unmet count either.
    expect(screen.getByText("On demand")).toBeTruthy();
    expect(screen.queryByText("0/2 today")).toBeNull();
    expect(screen.queryByText(/\/2 today/)).toBeNull();
  });

  it("keeps live progress on an off-today routine once anything is done today", () => {
    mockUseRoutines.mockReturnValue({
      data: [
        makeRoutine("r-1", "Deep clean", ["mood", "journal"], {
          cadence: "on-demand",
          customDays: [],
        }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    // A manual run: mood logged today on a never-scheduled routine.
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("1/2 today")).toBeTruthy();
    expect(screen.queryByText("On demand")).toBeNull();
  });

  it("offers the starter routine at zero routines and writes it on Keep", async () => {
    // Composed from RECORDS (#1954): two tools with a record, and no dashboard row
    // anywhere - the shape every post-redesign install has.
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({
        journalEntries: [{ dayKey: "2026-09-02" }],
        moodLogs: [{ dayKey: "2026-09-01" }],
      }),
    );

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.getByText("Start with a ready-made routine?")).toBeTruthy();

    fireEvent.press(screen.getByText("Keep"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" }));
    expect(addStep).toHaveBeenCalledTimes(2);
    expect(addStep).toHaveBeenNthCalledWith(1, {
      routineId: "r-new",
      toolId: "mood",
      position: 0,
    });
    expect(addStep).toHaveBeenNthCalledWith(2, {
      routineId: "r-new",
      toolId: "journal",
      position: 1,
    });
  });

  it("dismisses the starter offer on Skip without writing anything", () => {
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({
        moodLogs: [{ dayKey: "2026-09-01" }],
        journalEntries: [{ dayKey: "2026-09-02" }],
      }),
    );

    renderWithProviders(<RoutinesHomeScreen />);
    fireEvent.press(screen.getByText("Skip"));

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("No routines yet")).toBeTruthy();
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("shows the plain empty state when the records compose fewer than two steps", () => {
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({
        moodLogs: [{ dayKey: "2026-09-01" }],
        // Habits is excluded from starter composition, so this adds nothing.
        habitLogs: [{ loggedOn: "2026-09-01" }],
      }),
    );

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("No routines yet")).toBeTruthy();
  });

  it("claims nothing while the records are still loading - neither offer nor empty card", () => {
    // `{}` is the not-yet-fetched shape. An empty card here would tell a person with
    // two hundred journal entries to build their own; the offer would be missing steps.
    mockUseRoutineToolRecords.mockReturnValue({});

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.queryByText("No routines yet")).toBeNull();
    // The screen itself is up: the header and the new-routine door render regardless.
    expect(screen.getByText("New routine")).toBeTruthy();
  });

  it("fetches the full steppable list on the empty path, and only the referenced tools otherwise", () => {
    mockUseRoutineToolRecords.mockReturnValue(readyRecords());
    renderWithProviders(<RoutinesHomeScreen />);
    expect(mockUseRoutineToolRecords).toHaveBeenLastCalledWith("user-1", STEPPABLE_TOOL_IDS);

    mockUseRoutines.mockReturnValue({
      data: [makeRoutine("r-1", "Morning reset", ["mood", "journal"])],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    renderWithProviders(<RoutinesHomeScreen />);
    expect(mockUseRoutineToolRecords).toHaveBeenLastCalledWith("user-1", ["mood", "journal"]);
  });

  it("does not fire the wide fetch while the routine list is still unknown", () => {
    mockUseRoutines.mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<
      typeof useRoutines
    >);
    renderWithProviders(<RoutinesHomeScreen />);
    expect(mockUseRoutineToolRecords).toHaveBeenLastCalledWith("user-1", []);
  });

  it("never shows the starter offer once routines exist", () => {
    mockUseRoutines.mockReturnValue({
      data: [makeRoutine("r-1", "Morning reset", ["mood"])],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({
        moodLogs: [{ dayKey: "2026-09-01" }],
        journalEntries: [{ dayKey: "2026-09-02" }],
      }),
    );

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("Morning reset")).toBeTruthy();
  });
});
