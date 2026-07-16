import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { defaultUserPreferences } from "@/src/features/modules/types";
import { STEPPABLE_TOOL_IDS } from "@/src/features/routines/derive";
import {
  RoutineEditorScreen,
  STEP_TOOL_GROUPS,
} from "@/src/features/routines/routine-editor-screen";
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
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { cancelReminder, scheduleReminder } from "@/src/lib/notifications";
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

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn(),
  getReminderTimeZone: jest.fn(() => "Europe/Sofia"),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockScheduleReminder = scheduleReminder as jest.MockedFunction<typeof scheduleReminder>;
const mockCancelReminder = cancelReminder as jest.MockedFunction<typeof cancelReminder>;
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

describe("RoutineEditorScreen", () => {
  const createRoutine = jest.fn();
  const updateRoutine = jest.fn();
  const addStep = jest.fn();
  const removeStep = jest.fn();
  const reorderSteps = jest.fn();
  const updatePreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPreferences.mockReturnValue({
      data: defaultUserPreferences,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseUpdateUserPreferences.mockReturnValue({
      mutateAsync: updatePreferences,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
    updatePreferences.mockResolvedValue(undefined);
    mockScheduleReminder.mockResolvedValue({ enabled: true });
    mockCancelReminder.mockResolvedValue(undefined);
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

  // ----- Grouped Add-step picker (#123) -----

  it("partitions the steppable set: every tool appears in exactly one picker group", () => {
    const grouped = STEP_TOOL_GROUPS.flatMap((group) => group.tools);
    expect([...grouped].sort()).toEqual([...STEPPABLE_TOOL_IDS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("renders the five group headers over the add-step chips", () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    expect(screen.getByText("Check-ins & logs")).toBeTruthy();
    expect(screen.getByText("Mindfulness")).toBeTruthy();
    expect(screen.getByText("CBT")).toBeTruthy();
    expect(screen.getByText("ACT")).toBeTruthy();
    // "Habits" is both the group header and its only chip's label.
    expect(screen.getAllByText("Habits").length).toBeGreaterThanOrEqual(2);
  });

  it("adds a newly admitted ACT tool as a step and saves it like any other", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByLabelText("Add Defusion log"));

    // Same chip behavior as the original nine: added state + a step row.
    expect(screen.getByLabelText("Defusion log is already a step")).toBeTruthy();
    expect(screen.getByLabelText("Remove Defusion log")).toBeTruthy();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalled());
    expect(addStep).toHaveBeenCalledWith({
      routineId: "r-new",
      toolId: "defusion",
      position: 0,
    });
  });

  // ----- Days section (#105) -----

  it("renders the cadence chips with Every day active and keeps the default create payload schedule-free", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    expect(screen.getByRole("radio", { name: "Every day" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Weekdays" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Custom" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "On demand" })).not.toBeChecked();
    // The day chips only appear under Custom.
    expect(screen.queryByRole("checkbox", { name: "Mon" })).toBeNull();

    fireEvent.press(screen.getByText("Save"));

    // Daily is the DB default - the payload stays "just a name".
    await waitFor(() => expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" }));
  });

  it("saves the weekdays cadence in the create payload", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByRole("radio", { name: "Weekdays" }));
    expect(screen.getByRole("radio", { name: "Weekdays" })).toBeChecked();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        name: "My daily routine",
        cadence: "weekdays",
      }),
    );
  });

  it("switching to Custom shows the Mon-first day chips with Mon-Fri preselected and saves them", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByRole("radio", { name: "Custom" }));

    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      expect(screen.getByRole("checkbox", { name: day })).toBeChecked();
    }
    expect(screen.getByRole("checkbox", { name: "Sat" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Sun" })).not.toBeChecked();

    fireEvent.press(screen.getByRole("checkbox", { name: "Mon" }));
    fireEvent.press(screen.getByRole("checkbox", { name: "Sun" }));
    fireEvent.press(screen.getByText("Save"));

    // Days stay JS getDay() numbers, sorted ascending (Sun toggled on = 0).
    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        name: "My daily routine",
        cadence: "custom",
        customDays: [0, 2, 3, 4, 5],
      }),
    );
  });

  it("blocks the save with an inline error when Custom has zero days", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByRole("radio", { name: "Custom" }));
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      fireEvent.press(screen.getByRole("checkbox", { name: day }));
    }
    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Pick at least one day for a custom cadence.")).toBeTruthy();
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("hydrates a custom routine's days and patches only the toggled days on save", async () => {
    const custom: RoutineWithSteps = { ...EXISTING, cadence: "custom", customDays: [1, 3] };
    mockUseRoutines.mockReturnValue({ data: [custom] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Mon" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Wed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tue" })).not.toBeChecked();

    fireEvent.press(screen.getByRole("checkbox", { name: "Sat" }));
    fireEvent.press(screen.getByText("Save"));

    // Cadence is unchanged, so the patch carries just the new day set.
    await waitFor(() =>
      expect(updateRoutine).toHaveBeenCalledWith({
        id: "r-1",
        patch: { customDays: [1, 3, 6] },
      }),
    );
  });

  // ----- On demand hides reminders (#102) -----

  it("hides the reminder section under On demand and keeps the create payload reminder-free", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    // Turn the reminder on FIRST, then go on-demand: the section disappears
    // and the forced-off reminder never reaches the payload or the channel.
    fireEvent.press(screen.getByLabelText("Remind me about this routine"));
    fireEvent.press(screen.getByRole("radio", { name: "On demand" }));

    expect(screen.queryByLabelText("Remind me about this routine")).toBeNull();
    expect(screen.queryByLabelText("Reminder time")).toBeNull();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        name: "My daily routine",
        cadence: "on-demand",
      }),
    );
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("switching an existing routine to On demand disables its reminder in the patch", async () => {
    const withReminder: RoutineWithSteps = {
      ...EXISTING,
      reminderEnabled: true,
      reminderHour: 8,
      reminderMinute: 30,
      reminderTimezone: "Europe/Sofia",
    };
    mockUseRoutines.mockReturnValue({ data: [withReminder] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    // Reminder section visible while daily...
    expect(screen.getByLabelText("Remind me about this routine")).toBeTruthy();

    fireEvent.press(screen.getByRole("radio", { name: "On demand" }));
    expect(screen.queryByLabelText("Remind me about this routine")).toBeNull();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateRoutine).toHaveBeenCalledWith({
        id: "r-1",
        patch: {
          cadence: "on-demand",
          reminderEnabled: false,
          reminderHour: 8,
          reminderMinute: 30,
          reminderTimezone: "Europe/Sofia",
        },
      }),
    );
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  // ----- Routine reminder (#47) -----

  it("keeps the reminder OFF by default: no time field, no channel registration, no reminder fields saved", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    // Toggle rendered but off; the time picker only appears once enabled.
    expect(screen.getByLabelText("Remind me about this routine")).toBeTruthy();
    expect(screen.queryByLabelText("Reminder time")).toBeNull();

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" }));
    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it("enabling + save registers the push channel and persists the reminder fields (create)", async () => {
    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByLabelText("Remind me about this routine"));
    expect(screen.getByLabelText("Reminder time")).toBeTruthy();
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        name: "My daily routine",
        reminderEnabled: true,
        reminderHour: 19,
        reminderMinute: 0,
        reminderTimezone: "Europe/Sofia",
      }),
    );
    expect(mockScheduleReminder).toHaveBeenCalledWith("routine", 19, 0, "user-1");
    // Enabling is the explicit opt-in: consent is recorded (default prefs had none).
    expect(updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ reminderConsent: true }),
    );
  });

  it("enabling in edit mode writes the reminder patch through updateRoutine", async () => {
    mockUseRoutines.mockReturnValue({ data: [EXISTING] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    fireEvent.press(screen.getByLabelText("Remind me about this routine"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateRoutine).toHaveBeenCalledWith({
        id: "r-1",
        patch: {
          reminderEnabled: true,
          reminderHour: 19,
          reminderMinute: 0,
          reminderTimezone: "Europe/Sofia",
        },
      }),
    );
    expect(mockScheduleReminder).toHaveBeenCalledWith("routine", 19, 0, "user-1");
  });

  it("saves the reminder OFF and explains when the channel can't be enabled", async () => {
    mockScheduleReminder.mockResolvedValue({ enabled: false, reason: "permission-denied" });

    renderWithProviders(<RoutineEditorScreen fallbackHref="/routines" mode="create" />);

    fireEvent.press(screen.getByLabelText("Remind me about this routine"));
    fireEvent.press(screen.getByText("Save"));

    // The routine itself still saves - with NO reminder fields - and the user stays
    // on the editor with a calm explanation instead of a silent "on".
    await waitFor(() => expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" }));
    expect(
      await screen.findByText(
        "Notifications couldn't be turned on for this device, so the routine was saved with the reminder off. You can try again anytime.",
      ),
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // ----- Overlap note (#47: calm, non-blocking, tap-only) -----

  it("shows the overlap note only when the routine reminder is on AND a step tool's reminder is on", () => {
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, moodRemindersEnabled: true },
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseRoutines.mockReturnValue({ data: [EXISTING] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    // Routine reminder still off -> no note even though mood's tool reminder is on.
    const noteText =
      "Some steps also have their own tool reminder. That's fine - nothing changes unless you choose to.";
    expect(screen.queryByText(noteText)).toBeNull();

    fireEvent.press(screen.getByLabelText("Remind me about this routine"));

    // Now the overlap is real: the note lists mood (reminder on) but not journal (off).
    expect(screen.getByText(noteText)).toBeTruthy();
    expect(screen.getByLabelText("Turn off the Mood check-in reminder")).toBeTruthy();
    expect(screen.queryByLabelText("Turn off the Journal reminder")).toBeNull();
  });

  it("one tap disables exactly that per-tool reminder; nothing changes without a tap", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        moodRemindersEnabled: true,
        journalRemindersEnabled: true,
      },
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseRoutines.mockReturnValue({ data: [EXISTING] } as unknown as ReturnType<
      typeof useRoutines
    >);

    renderWithProviders(
      <RoutineEditorScreen fallbackHref="/routines/r-1" mode="edit" routineId="r-1" />,
    );

    fireEvent.press(screen.getByLabelText("Remind me about this routine"));

    // Both overlapping tools listed; NOTHING written yet (no auto-consolidation).
    expect(screen.getByLabelText("Turn off the Mood check-in reminder")).toBeTruthy();
    expect(screen.getByLabelText("Turn off the Journal reminder")).toBeTruthy();
    expect(updatePreferences).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Turn off the Mood check-in reminder"));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({ moodRemindersEnabled: false }),
    );
    // Exactly one write, scoped to the tapped tool - journal's reminder is untouched.
    expect(updatePreferences).toHaveBeenCalledTimes(1);
    expect(mockCancelReminder).toHaveBeenCalledWith("mood", "user-1");
  });
});
