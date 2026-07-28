import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { RoutinesWidget } from "@/src/features/home/widgets/routines-widget";
import { useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

const mockRouter = jest.mocked(router);
const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;

function makeRoutine(
  id: string,
  name: string,
  toolIds: readonly ("mood" | "journal" | "gratitude")[],
  schedule: Partial<Pick<RoutineWithSteps, "cadence" | "customDays">> = {},
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled: false,
    reminderHour: null,
    reminderMinute: null,
    reminderTimezone: null,
    cadence: schedule.cadence ?? "daily",
    customDays: schedule.customDays ?? [],
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

function setRoutines(routines: RoutineWithSteps[]) {
  mockUseRoutines.mockReturnValue({ data: routines, isLoading: false } as unknown as ReturnType<
    typeof useRoutines
  >);
}

describe("RoutinesWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoutineToolRecords.mockReturnValue({});
  });

  it("shows a quiet doorway to the Routines page at zero routines", () => {
    setRoutines([]);

    renderWithProviders(<RoutinesWidget userId="user-1" />);

    expect(screen.getByText("Routines today")).toBeTruthy();
    fireEvent.press(screen.getByText("Explore routines"));
    expect(mockRouter.push).toHaveBeenCalledWith("/routines");
    // No progress pill and no per-routine rows without routines.
    expect(screen.queryByText(/\d+\/\d+ steps/)).toBeNull();
  });

  it("summarizes each routine's today progress while steps are open", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal", "gratitude"]),
    ]);
    // A mood log today completes r-1's only step; r-2 stays fully open.
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutinesWidget userId="user-1" />);

    expect(screen.getByText("1/3 steps")).toBeTruthy();
    expect(screen.getByText("Morning reset")).toBeTruthy();
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(screen.getByText("Evening wind-down")).toBeTruthy();
    expect(screen.getByText("0/2")).toBeTruthy();

    fireEvent.press(screen.getByText("Open"));
    expect(mockRouter.push).toHaveBeenCalledWith("/routines");
  });

  // #104: the widget surfaces SCHEDULED-TODAY routines only.
  describe("scheduled-today filtering (#104)", () => {
    const todayDow = new Date().getDay();
    const otherDow = (todayDow + 1) % 7;

    it("lists only scheduled routines and counts only their steps", () => {
      // r-2 is on-demand with an open step: invisible to the widget, and the
      // progress pill counts r-1's single step only (not 0/2).
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Reset kit", ["journal"], { cadence: "on-demand" }),
      ]);

      renderWithProviders(<RoutinesWidget userId="user-1" />);

      expect(screen.getByText("Morning reset")).toBeTruthy();
      expect(screen.queryByText("Reset kit")).toBeNull();
      expect(screen.getByText("0/1 steps")).toBeTruthy();
      expect(screen.queryByText("0/2 steps")).toBeNull();
    });

    it("renders nothing at all on a day where no routine is scheduled", () => {
      setRoutines([
        makeRoutine("r-1", "Off-day routine", ["mood"], {
          cadence: "custom",
          customDays: [otherDow],
        }),
        makeRoutine("r-2", "Reset kit", ["journal"], { cadence: "on-demand" }),
      ]);

      renderWithProviders(<RoutinesWidget userId="user-1" />);

      expect(screen.queryByText("Routines today")).toBeNull();
      expect(screen.queryByText("Off-day routine")).toBeNull();
      expect(screen.queryByText("Open")).toBeNull();
    });

    it("still lists a custom-days routine that is scheduled today", () => {
      setRoutines([
        makeRoutine("r-1", "On-day routine", ["mood"], {
          cadence: "custom",
          customDays: [todayDow],
        }),
      ]);

      renderWithProviders(<RoutinesWidget userId="user-1" />);

      expect(screen.getByText("On-day routine")).toBeTruthy();
      expect(screen.getByText("0/1 steps")).toBeTruthy();
    });

    it("reaches done-for-today when all scheduled steps are done, despite open on-demand steps", () => {
      setRoutines([
        makeRoutine("r-1", "Morning reset", ["mood"]),
        makeRoutine("r-2", "Reset kit", ["journal"], { cadence: "on-demand" }),
      ]);
      mockUseRoutineToolRecords.mockReturnValue({
        moodLogs: [{ dayKey: currentDateKey() }],
      });

      renderWithProviders(<RoutinesWidget userId="user-1" />);

      expect(
        screen.getByText("Everything came together today. Nothing left to do here."),
      ).toBeTruthy();
      expect(screen.getByText("1/1 steps")).toBeTruthy();
    });
  });

  it("shows the calm done-for-today state with no streak language when all complete", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal"]),
    ]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ dayKey: currentDateKey() }],
      journalEntries: [{ dayKey: currentDateKey() }],
    });

    renderWithProviders(<RoutinesWidget userId="user-1" />);

    expect(
      screen.getByText("Everything came together today. Nothing left to do here."),
    ).toBeTruthy();
    expect(screen.getByText("2/2 steps")).toBeTruthy();
    // Calm by design: no streaks, no celebration.
    expect(screen.queryByText(/streak/i)).toBeNull();
    // The per-routine rows collapse into the single done state.
    expect(screen.queryByText("Morning reset")).toBeNull();
  });
});
