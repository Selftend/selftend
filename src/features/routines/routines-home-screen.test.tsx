import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import RoutinesHomeScreen from "./routines-home-screen";
import { useWidgetPreferences } from "@/src/features/home/queries";
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

jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: jest.fn(),
}));

const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseCreateRoutine = useCreateRoutine as jest.MockedFunction<typeof useCreateRoutine>;
const mockUseAddStep = useAddStep as jest.MockedFunction<typeof useAddStep>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;
const mockUseWidgetPreferences = useWidgetPreferences as jest.MockedFunction<
  typeof useWidgetPreferences
>;

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
    mockUseWidgetPreferences.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useWidgetPreferences
    >);
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
      moodLogs: [{ loggedAt: `${currentDateKey()}T12:00:00` }],
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
      moodLogs: [{ loggedAt: `${dayKeys[5]}T12:00:00` }, { loggedAt: `${dayKeys[3]}T12:00:00` }],
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
      moodLogs: [{ loggedAt: `${currentDateKey()}T12:00:00` }],
    });

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("1/2 today")).toBeTruthy();
    expect(screen.queryByText("On demand")).toBeNull();
  });

  it("offers the starter routine at zero routines and writes it on Keep", async () => {
    mockUseWidgetPreferences.mockReturnValue({
      data: [
        { id: "w-1", userId: "user-1", widgetId: "mood-checkin", position: 0, createdAt: "" },
        { id: "w-2", userId: "user-1", widgetId: "journal-week", position: 1, createdAt: "" },
      ],
    } as unknown as ReturnType<typeof useWidgetPreferences>);

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
    mockUseWidgetPreferences.mockReturnValue({
      data: [
        { id: "w-1", userId: "user-1", widgetId: "mood-checkin", position: 0, createdAt: "" },
        { id: "w-2", userId: "user-1", widgetId: "journal-week", position: 1, createdAt: "" },
      ],
    } as unknown as ReturnType<typeof useWidgetPreferences>);

    renderWithProviders(<RoutinesHomeScreen />);
    fireEvent.press(screen.getByText("Skip"));

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("No routines yet")).toBeTruthy();
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("shows the plain empty state when the kept widgets yield fewer than two steps", () => {
    mockUseWidgetPreferences.mockReturnValue({
      data: [
        { id: "w-1", userId: "user-1", widgetId: "mood-checkin", position: 0, createdAt: "" },
        // Habits is excluded from starter composition, so this adds nothing.
        { id: "w-2", userId: "user-1", widgetId: "habits-today", position: 1, createdAt: "" },
      ],
    } as unknown as ReturnType<typeof useWidgetPreferences>);

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("No routines yet")).toBeTruthy();
  });

  it("never shows the starter offer once routines exist", () => {
    mockUseRoutines.mockReturnValue({
      data: [makeRoutine("r-1", "Morning reset", ["mood"])],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoutines>);
    mockUseWidgetPreferences.mockReturnValue({
      data: [
        { id: "w-1", userId: "user-1", widgetId: "mood-checkin", position: 0, createdAt: "" },
        { id: "w-2", userId: "user-1", widgetId: "journal-week", position: 1, createdAt: "" },
      ],
    } as unknown as ReturnType<typeof useWidgetPreferences>);

    renderWithProviders(<RoutinesHomeScreen />);

    expect(screen.queryByText("Start with a ready-made routine?")).toBeNull();
    expect(screen.getByText("Morning reset")).toBeTruthy();
  });
});
