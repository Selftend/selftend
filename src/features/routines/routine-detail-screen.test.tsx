import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { RoutineDetailScreen } from "@/src/features/routines/routine-detail-screen";
import { useDeleteRoutine, useRoutine } from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { renderWithProviders } from "@/test/render-with-providers";
import { currentDateKey } from "@/src/utils/date";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/routines/r-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutine: jest.fn(),
  useDeleteRoutine: jest.fn(),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

const mockUseRoutine = useRoutine as jest.MockedFunction<typeof useRoutine>;
const mockUseDeleteRoutine = useDeleteRoutine as jest.MockedFunction<typeof useDeleteRoutine>;
const mockUseRoutineToolRecords = useRoutineToolRecords as jest.MockedFunction<
  typeof useRoutineToolRecords
>;

const ROUTINE: RoutineWithSteps = {
  id: "r-1",
  userId: "user-1",
  name: "Morning reset",
  reminderEnabled: false,
  reminderHour: null,
  reminderMinute: null,
  reminderTimezone: null,
  cadence: "daily",
  customDays: [],
  createdAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-01T08:00:00.000Z",
  steps: [
    {
      id: "s-1",
      routineId: "r-1",
      userId: "user-1",
      toolId: "mood",
      position: 0,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    },
    {
      id: "s-2",
      routineId: "r-1",
      userId: "user-1",
      toolId: "journal",
      position: 1,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    },
  ],
};

describe("RoutineDetailScreen", () => {
  const deleteRoutine = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoutine.mockReturnValue({ data: ROUTINE, isLoading: false } as unknown as ReturnType<
      typeof useRoutine
    >);
    mockUseDeleteRoutine.mockReturnValue({
      mutateAsync: deleteRoutine,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteRoutine>);
    // A mood log today: step 1 done, step 2 (journal) not yet.
    mockUseRoutineToolRecords.mockReturnValue({
      moodLogs: [{ loggedAt: `${currentDateKey()}T12:00:00` }],
    });
    deleteRoutine.mockResolvedValue(undefined);
  });

  it("renders the routine name and each step's per-day done state", () => {
    renderWithProviders(<RoutineDetailScreen routineId="r-1" />);

    expect(screen.getByText("Morning reset")).toBeTruthy();
    expect(screen.getByText(/In progress · 1\/2 today/)).toBeTruthy();
    expect(screen.getByText("Mood check-in")).toBeTruthy();
    expect(screen.getByText("Done today")).toBeTruthy();
    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getByText("Not yet today")).toBeTruthy();
  });

  it("renders the last-7-days strip with the calm note and only neutral gaps", () => {
    // Only a mood log today: the two-step routine never reached complete on
    // any of the 7 days, so every cell is a neutral open day.
    renderWithProviders(<RoutineDetailScreen routineId="r-1" />);

    expect(screen.getByText("Last 7 days")).toBeTruthy();
    expect(
      screen.getByText(
        "Filled days are days the whole routine came together. Empty days are just empty - one missed day doesn't undo what you're building.",
      ),
    ).toBeTruthy();
    expect(screen.queryAllByLabelText(/: routine complete$/)).toHaveLength(0);
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(7);
    expect(screen.queryByText(/streak/i)).toBeNull();
  });

  it("deletes the routine after the confirm dialog and returns to the list", async () => {
    renderWithProviders(<RoutineDetailScreen routineId="r-1" />);

    // The screen's Delete action opens the house confirm dialog...
    fireEvent.press(screen.getByText("Delete"));
    expect(screen.getByText("Delete routine")).toBeTruthy();
    expect(deleteRoutine).not.toHaveBeenCalled();

    // ...and only the dialog's confirm actually deletes.
    const confirmButtons = screen.getAllByText("Delete");
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteRoutine).toHaveBeenCalledWith("r-1"));
    expect(router.replace).toHaveBeenCalledWith("/routines");
  });

  it("shows the not-found message when the routine is gone", () => {
    mockUseRoutine.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
      typeof useRoutine
    >);

    renderWithProviders(<RoutineDetailScreen routineId="r-404" />);

    expect(screen.getByText("This routine doesn't exist anymore.")).toBeTruthy();
  });
});
