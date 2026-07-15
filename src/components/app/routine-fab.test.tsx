import { fireEvent, screen } from "@testing-library/react-native";

import { RoutineFab } from "@/src/components/app/routine-fab";
import { useRoutines } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
  useUpdateRoutine: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  getReminderTimeZone: () => "Europe/Sofia",
}));

// The async AccessibilityInfo probe resolves after the test ends, tripping the
// act() guard - pin it like the other sheet tests do.
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;

function makeRoutine(
  id: string,
  name: string,
  toolIds: readonly ("mood" | "journal" | "gratitude")[],
): RoutineWithSteps {
  return {
    id,
    userId: "user-1",
    name,
    reminderEnabled: false,
    reminderHour: null,
    reminderMinute: null,
    reminderTimezone: null,
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

function setRoutines(routines: RoutineWithSteps[], isLoading = false) {
  mockUseRoutines.mockReturnValue({ data: routines, isLoading } as unknown as ReturnType<
    typeof useRoutines
  >);
}

describe("RoutineFab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoutineToolRecords.mockReturnValue({});
  });

  it("renders nothing at zero routines", () => {
    setRoutines([]);

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByTestId("routine-fab")).toBeNull();
  });

  it("renders nothing while all steps are complete today", () => {
    setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
    });

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByTestId("routine-fab")).toBeNull();
  });

  it("shows the aggregate N/M while some step is still open", () => {
    setRoutines([
      makeRoutine("r-1", "Morning reset", ["mood"]),
      makeRoutine("r-2", "Evening wind-down", ["journal", "gratitude"]),
    ]);
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ loggedAt: `${currentDateKey()}T08:00:00` }],
    });

    renderWithProviders(<RoutineFab />);

    expect(screen.getByTestId("routine-fab")).toBeTruthy();
    expect(screen.getByText("1/3")).toBeTruthy();
    expect(screen.getByLabelText("Continue your routine: 1 of 3 steps done today")).toBeTruthy();
  });

  it("opens the continue-your-routine sheet on press", () => {
    setRoutines([makeRoutine("r-1", "Morning reset", ["mood"])]);

    renderWithProviders(<RoutineFab />);

    expect(screen.queryByText("Continue your routine")).toBeNull();
    fireEvent.press(screen.getByTestId("routine-fab"));
    expect(screen.getByText("Continue your routine")).toBeTruthy();
    expect(screen.getByText("Do next step")).toBeTruthy();
  });
});
