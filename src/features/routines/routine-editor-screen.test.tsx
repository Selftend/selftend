import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { RoutineEditorScreen } from "@/src/features/routines/routine-editor-screen";
import {
  useAddStep,
  useCreateRoutine,
  useRemoveStep,
  useReorderSteps,
  useRoutine,
  useRoutines,
  useUpdateRoutine,
} from "@/src/features/routines/queries";
import type { RoutineWithSteps } from "@/src/features/routines/types";
import { renderWithProviders } from "@/test/render-with-providers";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/routines/new",
}));

jest.mock("react-native-sortables", () => ({
  __esModule: true,
  default: {
    Flex: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Handle: ({ children }: { children?: ReactNode }) => <>{children}</>,
  },
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutine: jest.fn(),
  useRoutines: jest.fn(),
  useCreateRoutine: jest.fn(),
  useUpdateRoutine: jest.fn(),
  useAddStep: jest.fn(),
  useRemoveStep: jest.fn(),
  useReorderSteps: jest.fn(),
}));

const mockUseRoutine = useRoutine as jest.MockedFunction<typeof useRoutine>;
const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseCreateRoutine = useCreateRoutine as jest.MockedFunction<typeof useCreateRoutine>;
const mockUseUpdateRoutine = useUpdateRoutine as jest.MockedFunction<typeof useUpdateRoutine>;
const mockUseAddStep = useAddStep as jest.MockedFunction<typeof useAddStep>;
const mockUseRemoveStep = useRemoveStep as jest.MockedFunction<typeof useRemoveStep>;
const mockUseReorderSteps = useReorderSteps as jest.MockedFunction<typeof useReorderSteps>;

const EXISTING: RoutineWithSteps = {
  id: "r-1",
  userId: "user-1",
  name: "Morning reset",
  reminderEnabled: false,
  reminderHour: null,
  reminderMinute: null,
  reminderTimezone: null,
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

describe("RoutineEditorScreen", () => {
  const createRoutine = jest.fn();
  const updateRoutine = jest.fn();
  const addStep = jest.fn();
  const removeStep = jest.fn();
  const reorderSteps = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoutines.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRoutines>);
    mockUseRoutine.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
      typeof useRoutine
    >);
    mockUseCreateRoutine.mockReturnValue({
      mutateAsync: createRoutine,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateRoutine>);
    mockUseUpdateRoutine.mockReturnValue({
      mutateAsync: updateRoutine,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateRoutine>);
    mockUseAddStep.mockReturnValue({
      mutateAsync: addStep,
      isPending: false,
    } as unknown as ReturnType<typeof useAddStep>);
    mockUseRemoveStep.mockReturnValue({
      mutateAsync: removeStep,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveStep>);
    mockUseReorderSteps.mockReturnValue({
      mutateAsync: reorderSteps,
      isPending: false,
    } as unknown as ReturnType<typeof useReorderSteps>);
    createRoutine.mockResolvedValue({ id: "r-new" });
    updateRoutine.mockResolvedValue({ id: "r-1" });
    addStep.mockImplementation(({ toolId }: { toolId: string }) =>
      Promise.resolve({ id: `created-${toolId}` }),
    );
    removeStep.mockResolvedValue(undefined);
    reorderSteps.mockResolvedValue(undefined);
  });

  it("creates a routine with the default name and the chosen steps in order", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    // The name field is pre-filled with the i18n default.
    expect(screen.getByDisplayValue("My daily routine")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Add Mood check-in"));
    fireEvent.press(screen.getByLabelText("Add Journal"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" }));
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
    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/routines/[id]",
      params: { id: "r-new" },
    });
  });

  it("reorders steps with the up/down arrows before saving", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByLabelText("Add Mood check-in"));
    fireEvent.press(screen.getByLabelText("Add Journal"));
    fireEvent.press(screen.getByLabelText("Move Journal up"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalled());
    expect(addStep).toHaveBeenNthCalledWith(1, {
      routineId: "r-new",
      toolId: "journal",
      position: 0,
    });
    expect(addStep).toHaveBeenNthCalledWith(2, {
      routineId: "r-new",
      toolId: "mood",
      position: 1,
    });
  });

  it("shows an inline error and saves nothing when the name is blank", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Routine name"), "   ");
    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Give the routine a short name.")).toBeTruthy();
    expect(createRoutine).not.toHaveBeenCalled();
    expect(addStep).not.toHaveBeenCalled();
  });

  it("persists a rename, a step removal, and the normalized order in edit mode", async () => {
    mockUseRoutines.mockReturnValue({ data: [EXISTING] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    // Hydrated from the loaded routine.
    expect(screen.getByDisplayValue("Morning reset")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Routine name"), "Evening reset");
    fireEvent.press(screen.getByLabelText("Remove Journal"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateRoutine).toHaveBeenCalledWith({
        id: "r-1",
        patch: { name: "Evening reset" },
      }),
    );
    expect(removeStep).toHaveBeenCalledWith("s-2");
    expect(reorderSteps).toHaveBeenCalledWith({ routineId: "r-1", orderedStepIds: ["s-1"] });
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("persists an arrow reorder of existing steps without touching name or membership", async () => {
    mockUseRoutines.mockReturnValue({ data: [EXISTING] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    fireEvent.press(screen.getByLabelText("Move Mood check-in down"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(reorderSteps).toHaveBeenCalledWith({
        routineId: "r-1",
        orderedStepIds: ["s-2", "s-1"],
      }),
    );
    expect(updateRoutine).not.toHaveBeenCalled();
    expect(removeStep).not.toHaveBeenCalled();
    expect(addStep).not.toHaveBeenCalled();
  });

  it("disables a tool's add chip once it is already a step", () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByLabelText("Add Mood check-in"));

    expect(screen.getByLabelText("Mood check-in is already a step")).toBeTruthy();
    // Pressing the disabled chip must not add a duplicate row.
    fireEvent.press(screen.getByLabelText("Mood check-in is already a step"));
    expect(screen.getAllByLabelText(/Remove Mood check-in/)).toHaveLength(1);
  });
});
