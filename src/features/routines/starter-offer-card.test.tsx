import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { useAngerLogs } from "@/src/features/anger/queries";
import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import type { RoutineToolRecords } from "@/src/features/routines/derive";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useWorryEntries } from "@/src/features/worry/queries";
import {
  useCreateRoutine,
  useAddStep,
  useDeleteRoutine,
  useRoutines,
} from "@/src/features/routines/queries";
import { StarterOfferCard } from "@/src/features/routines/starter-offer-card";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useLayeredInsetStore } from "@/src/stores/layered-inset-store";
import { useReminderPromptStore } from "@/src/stores/reminder-prompt-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
  useCreateRoutine: jest.fn(),
  useAddStep: jest.fn(),
  useDeleteRoutine: jest.fn(),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(),
}));

// The three prompting tools a routine cannot admit, counted since #1677's
// second-action decision.
jest.mock("@/src/features/worry/queries", () => ({ useWorryEntries: jest.fn() }));
jest.mock("@/src/features/anger/queries", () => ({ useAngerLogs: jest.fn() }));
jest.mock("@/src/features/self-care/queries", () => ({ useSelfCareLogs: jest.fn() }));

const mockUseUserPreferences = jest.mocked(useUserPreferences);
const mockUseUpdateUserPreferences = jest.mocked(useUpdateUserPreferences);
const mockUseRoutines = jest.mocked(useRoutines);
const mockUseCreateRoutine = jest.mocked(useCreateRoutine);
const mockUseAddStep = jest.mocked(useAddStep);
const mockUseDeleteRoutine = jest.mocked(useDeleteRoutine);
const mockUseRoutineToolRecords = jest.mocked(useRoutineToolRecords);
const mockUseWorryEntries = jest.mocked(useWorryEntries);
const mockUseAngerLogs = jest.mocked(useAngerLogs);
const mockUseSelfCareLogs = jest.mocked(useSelfCareLogs);

/** Fetched-and-empty offer-only slices; a scenario overrides the one it needs. */
function setOfferOnlyRecords(
  overrides: { worry?: unknown[]; anger?: unknown[]; selfCare?: unknown[] } = {},
) {
  mockUseWorryEntries.mockReturnValue({ data: overrides.worry ?? [] } as unknown as ReturnType<
    typeof useWorryEntries
  >);
  mockUseAngerLogs.mockReturnValue({ data: overrides.anger ?? [] } as unknown as ReturnType<
    typeof useAngerLogs
  >);
  mockUseSelfCareLogs.mockReturnValue({ data: overrides.selfCare ?? [] } as unknown as ReturnType<
    typeof useSelfCareLogs
  >);
}

const OFFER_TITLE = "Start with a ready-made routine?";

// Every slice fetched; overrides add the records a scenario needs.
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

function setPreferences(overrides: Partial<UserPreferences> = {}) {
  const preferences = { ...defaultUserPreferences, ...overrides };
  mockUseUserPreferences.mockReturnValue({ data: preferences } as ReturnType<
    typeof useUserPreferences
  >);
  return preferences;
}

function setUpdateMutation() {
  const mutateAsync = jest.fn().mockResolvedValue(undefined);
  mockUseUpdateUserPreferences.mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  return mutateAsync;
}

function setRoutineMutations() {
  const createRoutine = jest.fn().mockResolvedValue({ id: "routine-1" });
  const addStep = jest.fn().mockResolvedValue(undefined);
  const deleteRoutine = jest.fn().mockResolvedValue(undefined);
  mockUseCreateRoutine.mockReturnValue({
    isPending: false,
    mutateAsync: createRoutine,
  } as unknown as ReturnType<typeof useCreateRoutine>);
  mockUseAddStep.mockReturnValue({
    isPending: false,
    mutateAsync: addStep,
  } as unknown as ReturnType<typeof useAddStep>);
  mockUseDeleteRoutine.mockReturnValue({
    isPending: false,
    mutateAsync: deleteRoutine,
  } as unknown as ReturnType<typeof useDeleteRoutine>);
  return { createRoutine, addStep, deleteRoutine };
}

// The second-action baseline: two distinct tools have records, no routine
// exists - so those two records both pass the gate and compose the starter
// (#1954: one set, read twice) - and the reminder prompt was already asked for
// the saved tool, so the save is the starter offer's.
function setEligibleScenario() {
  const preferences = setPreferences({ reminderPromptedTools: ["journal"] });
  const prefsMutate = setUpdateMutation();
  const mutations = setRoutineMutations();
  mockUseRoutines.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRoutines>);
  mockUseRoutineToolRecords.mockReturnValue(
    readyRecords({
      moodLogs: [{ dayKey: "2026-09-01" }],
      journalEntries: [{ dayKey: "2026-09-02" }],
    }),
  );
  setOfferOnlyRecords();
  return { preferences, prefsMutate, ...mutations };
}

function requestSave(targetKey: "mood" | "journal" | "cbt" = "journal") {
  act(() => {
    useReminderPromptStore.getState().requestReminderPrompt(targetKey);
  });
}

describe("StarterOfferCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useReminderPromptStore.setState({ request: null, promptVisible: false });
      useLayeredInsetStore.setState({ edges: {} });
    });
  });

  it("renders nothing while no save was requested", () => {
    setEligibleScenario();

    renderWithProviders(<StarterOfferCard />);

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
  });

  it("shows the offer at the second action and marks it offered on show", async () => {
    const { prefsMutate } = setEligibleScenario();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    expect(await screen.findByText(OFFER_TITLE)).toBeTruthy();
    // The composed steps are on the card, in kept-widget order.
    expect(screen.getByText("Mood check-in")).toBeTruthy();
    expect(screen.getByText("Journal")).toBeTruthy();
    await waitFor(() => {
      expect(prefsMutate).toHaveBeenCalledWith({ starterRoutineOffered: true });
    });
  });

  it("yields the save to the reminder prompt", async () => {
    // Same second-action state, but the saved tool was never reminder-prompted:
    // the reminder prompt is eligible, so it wins this save outright.
    setEligibleScenario();
    setPreferences({ reminderPromptedTools: [] });
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("never shows again once the offer was shown", async () => {
    setEligibleScenario();
    setPreferences({ reminderPromptedTools: ["journal"], starterRoutineOffered: true });
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("renders nothing when the user already owns a routine", async () => {
    setEligibleScenario();
    mockUseRoutines.mockReturnValue({
      data: [{ id: "routine-1", steps: [] }],
    } as unknown as ReturnType<typeof useRoutines>);
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("renders nothing before the second distinct tool has records", async () => {
    setEligibleScenario();
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({ journalEntries: [{ dayKey: "2026-09-02" }] }),
    );
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("a worry entry is a second action but composes nothing, so no empty routine is offered", async () => {
    // Mood then a worry entry: the second tool is one a routine cannot hold. It
    // still counts toward the second action (#1677) - `countToolsWithRecords`
    // says 2 - but the starter composes from RECORDS now (#1954), and one
    // steppable tool is below its minimum. Before #1954 this scenario showed the
    // offer, composed from two kept widgets the person had never used; the offer
    // is now held until a second steppable tool has a record.
    setEligibleScenario();
    setPreferences({ reminderPromptedTools: ["cbt"] });
    const prefsMutate = setUpdateMutation();
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({ moodLogs: [{ dayKey: "2026-09-01" }] }),
    );
    setOfferOnlyRecords({ worry: [{ id: "worry-1" }] });

    renderWithProviders(<StarterOfferCard />);
    requestSave("cbt");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    // The save is consumed, not carried: nothing was offered, and nothing is written.
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("waits while an offer-only slice is still loading", async () => {
    // Mood + journal would qualify on their own, but worry's list has not arrived:
    // the readiness gate holds rather than deciding on a half-loaded shape.
    setEligibleScenario();
    setPreferences({ reminderPromptedTools: ["cbt"] });
    const prefsMutate = setUpdateMutation();
    setOfferOnlyRecords();
    mockUseWorryEntries.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useWorryEntries
    >);

    renderWithProviders(<StarterOfferCard />);
    requestSave("cbt");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("renders nothing when the gate passes but nothing composes: records only in worry, anger and self-care", async () => {
    // Three second actions a routine cannot admit (#1954, spec §5.3): the count is 3,
    // the composition is null, and the offer must not render an empty routine.
    setEligibleScenario();
    setPreferences({ reminderPromptedTools: ["cbt"] });
    const prefsMutate = setUpdateMutation();
    mockUseRoutineToolRecords.mockReturnValue(readyRecords());
    setOfferOnlyRecords({
      worry: [{ id: "worry-1" }],
      anger: [{ id: "anger-1" }],
      selfCare: [{ id: "self-care-1" }],
    });

    renderWithProviders(<StarterOfferCard />);
    requestSave("cbt");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("composes from the records themselves, with no dashboard rows anywhere", async () => {
    // A person who installed after the redesign holds zero widget_preferences rows
    // forever; the offer must still fire from two tools' records (#1954).
    setEligibleScenario();
    mockUseRoutineToolRecords.mockReturnValue(
      readyRecords({
        thoughtRecords: [{ dayKey: "2026-09-01" }],
        defusionLogs: [{ createdAt: "2026-09-02T08:00:00.000Z" }],
      }),
    );
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    expect(await screen.findByText(OFFER_TITLE)).toBeTruthy();
    await waitFor(() => {
      expect(prefsMutate).toHaveBeenCalledWith({ starterRoutineOffered: true });
    });
  });

  it("yields while the reminder prompt card is on screen", async () => {
    setEligibleScenario();
    act(() => {
      useReminderPromptStore.getState().setPromptVisible(true);
    });
    const prefsMutate = setUpdateMutation();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    await act(async () => {});

    expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    expect(prefsMutate).not.toHaveBeenCalled();
  });

  it("keeps the routine through the normal write path on accept, with no reminder", async () => {
    const { prefsMutate, createRoutine, addStep } = setEligibleScenario();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    fireEvent.press(await screen.findByText("Keep"));

    await waitFor(() => {
      expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" });
    });
    await waitFor(() => {
      expect(addStep).toHaveBeenCalledTimes(2);
    });
    expect(addStep).toHaveBeenNthCalledWith(1, {
      routineId: "routine-1",
      toolId: "mood",
      position: 0,
    });
    expect(addStep).toHaveBeenNthCalledWith(2, {
      routineId: "routine-1",
      toolId: "journal",
      position: 1,
    });
    await waitFor(() => {
      expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    });
    // The only preference write is the on-show mark: keeping the routine
    // attaches no reminder and touches nothing else.
    expect(prefsMutate).toHaveBeenCalledTimes(1);
    expect(prefsMutate).toHaveBeenCalledWith({ starterRoutineOffered: true });
  });

  it("declines silently: the shown-flag is the only write", async () => {
    const { prefsMutate, createRoutine } = setEligibleScenario();

    renderWithProviders(<StarterOfferCard />);
    requestSave("journal");

    fireEvent.press(await screen.findByText("Skip"));

    await waitFor(() => {
      expect(screen.queryByText(OFFER_TITLE)).toBeNull();
    });
    expect(createRoutine).not.toHaveBeenCalled();
    expect(prefsMutate).toHaveBeenCalledTimes(1);
    expect(prefsMutate).toHaveBeenCalledWith({ starterRoutineOffered: true });
  });
});
