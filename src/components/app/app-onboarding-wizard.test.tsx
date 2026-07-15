import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppOnboardingWizard } from "@/src/components/app/app-onboarding-wizard";
import { useAddStep, useCreateRoutine, useRoutines } from "@/src/features/routines/queries";
import { renderWithProviders } from "@/test/render-with-providers";

// RichOnboardingShell wraps content in a Modal. Replace Modal with a pass-through
// View so the wizard's children are always in the tree regardless of `visible`.
jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  function MockModal({ children, visible }: { children?: React.ReactNode; visible?: boolean }) {
    return visible === false ? null : React.createElement(actual.View, null, children);
  }
  MockModal.displayName = "MockModal";

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "Modal") return MockModal;
      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// The starter-routine gate reads the routine list; "Keep" writes through the
// normal routine mutations. Mock the query layer, keep the hooks real.
jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(),
  useCreateRoutine: jest.fn(),
  useAddStep: jest.fn(),
  useDeleteRoutine: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

const mockUseRoutines = useRoutines as jest.MockedFunction<typeof useRoutines>;
const mockUseCreateRoutine = useCreateRoutine as jest.MockedFunction<typeof useCreateRoutine>;
const mockUseAddStep = useAddStep as jest.MockedFunction<typeof useAddStep>;

const createRoutine = jest.fn();
const addStep = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  // Default: a fresh user with zero routines - the starter gate is open.
  mockUseRoutines.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRoutines>);
  mockUseCreateRoutine.mockReturnValue({
    mutateAsync: createRoutine,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateRoutine>);
  mockUseAddStep.mockReturnValue({
    mutateAsync: addStep,
    isPending: false,
  } as unknown as ReturnType<typeof useAddStep>);
  createRoutine.mockResolvedValue({ id: "r-new" });
  addStep.mockResolvedValue({ id: "s-new" });
});

function renderWizard(overrides: Partial<React.ComponentProps<typeof AppOnboardingWizard>> = {}) {
  const onFinish = jest.fn();
  const onSkip = jest.fn();
  renderWithProviders(
    <AppOnboardingWizard
      visible
      initialConcerns={[]}
      isPending={false}
      onFinish={onFinish}
      onSkip={onSkip}
      {...overrides}
    />,
  );
  return { onFinish, onSkip };
}

it("shows the welcome panel without a step counter on first login", () => {
  renderWizard();
  expect(screen.getByText("Welcome to Selftend")).toBeTruthy();
  expect(screen.getByText(/not a diagnosis tool/i)).toBeTruthy();
  expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
});

it("advances through concerns and module choices and supports Back", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("What brings you here?")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("Would a self-help module be useful?")).toBeTruthy();
  fireEvent.press(screen.getByText("Back"));
  expect(screen.getByText("What brings you here?")).toBeTruthy();
});

it("defaults module structure to the guided programme", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("CBT - work with thoughts and behavior"));
  fireEvent.press(screen.getByText("Continue"));

  expect(
    screen.getByRole("checkbox", { name: "A guided programme" }).props.accessibilityState.checked,
  ).toBe(true);
  expect(
    screen.getByRole("checkbox", { name: "Explore at my own pace" }).props.accessibilityState
      .checked,
  ).toBe(false);
});

it("can replay only the welcome introduction without entering recommendations", () => {
  const onSkip = jest.fn();
  renderWithProviders(
    <AppOnboardingWizard
      visible
      introductionOnly
      initialConcerns={[]}
      isPending={false}
      onFinish={jest.fn()}
      onSkip={onSkip}
    />,
  );

  fireEvent.press(screen.getByText("Finish"));

  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("What brings you here?")).toBeNull();
  // The starter panel is structurally unreachable in the welcome-only replay.
  expect(screen.queryByText("One small routine to start?")).toBeNull();
  expect(mockUseRoutines).toHaveBeenCalledWith(null);
});

it("skips guidance when no module is selected and offers the starter before finish", () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));

  // No module selected: guidance is skipped and the starter panel is next.
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.queryByText("How much structure would you like?")).toBeNull();
  expect(screen.getByText("One small routine to start?")).toBeTruthy();

  // Declining the starter writes nothing and finishes with the suggestions.
  fireEvent.press(screen.getByText("Skip"));

  expect(createRoutine).not.toHaveBeenCalled();
  expect(addStep).not.toHaveBeenCalled();
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: ["sleep"],
    widgetIds: ["mood-checkin", "sleep-latest", "meditation-pick", "breathing-suggested"],
  });
});

it("offers the starter panel after guidance and keeps it through the routine write path", async () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("ACT - make room for feelings and act on values"));
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("How much structure would you like?")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));

  // Panel sits after guidance, before finish: read-only numbered steps
  // (kept tools, Habits excluded, capped at 3) and an editable name.
  expect(screen.getByText("One small routine to start?")).toBeTruthy();
  expect(screen.getByText("Mood check-in")).toBeTruthy();
  expect(screen.getByText("Sleep log")).toBeTruthy();
  expect(screen.getByText("Meditation")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Routine name"), "Morning kit");

  fireEvent.press(screen.getByText("Keep"));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(createRoutine).toHaveBeenCalledWith({ name: "Morning kit" });
  expect(addStep).toHaveBeenCalledTimes(3);
  expect(addStep).toHaveBeenNthCalledWith(1, { routineId: "r-new", toolId: "mood", position: 0 });
  expect(addStep).toHaveBeenNthCalledWith(2, { routineId: "r-new", toolId: "sleep", position: 1 });
  expect(addStep).toHaveBeenNthCalledWith(3, {
    routineId: "r-new",
    toolId: "meditation",
    position: 2,
  });
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: ["sleep"],
    widgetIds: [
      "act-programme",
      "mood-checkin",
      "sleep-latest",
      "meditation-pick",
      "breathing-suggested",
    ],
  });
});

it("keeps the starter under the default name when the edited name is blank", async () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));

  fireEvent.changeText(screen.getByLabelText("Routine name"), "   ");
  fireEvent.press(screen.getByText("Keep"));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(createRoutine).toHaveBeenCalledWith({ name: "My daily routine" });
});

it("shows the save error and does not finish when Keep fails", async () => {
  createRoutine.mockRejectedValue(new Error("boom"));
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));

  fireEvent.press(screen.getByText("Keep"));

  await waitFor(() => expect(screen.getByText("boom")).toBeTruthy());
  expect(onFinish).not.toHaveBeenCalled();
  expect(addStep).not.toHaveBeenCalled();
});

it("never offers the starter once the user already has a routine", () => {
  mockUseRoutines.mockReturnValue({
    data: [{ id: "r-1", name: "Morning reset", steps: [] }],
  } as unknown as ReturnType<typeof useRoutines>);

  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));

  // Modules panel is last again: Finish goes straight out, no starter panel.
  fireEvent.press(screen.getByText("Finish"));

  expect(screen.queryByText("One small routine to start?")).toBeNull();
  expect(createRoutine).not.toHaveBeenCalled();
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it("does not offer the starter while the routine list is still unknown", () => {
  mockUseRoutines.mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useRoutines>);

  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Finish"));

  expect(screen.queryByText("One small routine to start?")).toBeNull();
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it("does not offer the starter when fewer than two eligible steps compose", () => {
  // No concerns selected: only the mood check-in composes, below the min-2 gate.
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Finish"));

  expect(screen.queryByText("One small routine to start?")).toBeNull();
  expect(createRoutine).not.toHaveBeenCalled();
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: [],
    widgetIds: ["mood-checkin"],
  });
});

it("applies guided programme and tool recommendations after declining the starter", () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Building habits"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("ACT - make room for feelings and act on values"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Skip"));

  expect(screen.queryByText("Your Home suggestions")).toBeNull();
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: ["sleep", "habits"],
    widgetIds: [
      "act-programme",
      "mood-checkin",
      "sleep-latest",
      "meditation-pick",
      "breathing-suggested",
      "habits-today",
      "journal-week",
    ],
  });
});

it("starts manual suggestions at the questions instead of the first-login welcome", () => {
  renderWizard({ includeWelcome: false });

  expect(screen.getByText("What brings you here?")).toBeTruthy();
  expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
});

it("prefills initial concerns and can skip from any panel", () => {
  const { onSkip, onFinish } = renderWizard({ initialConcerns: ["sleep"] });
  fireEvent.press(screen.getByText("Skip for now"));
  expect(onSkip).toHaveBeenCalled();
  expect(onFinish).not.toHaveBeenCalled();
});

it("supports Back from the starter panel to the previous panel", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("One small routine to start?")).toBeTruthy();

  // No module was selected, so Back returns to the modules panel.
  fireEvent.press(screen.getByText("Back"));
  expect(screen.getByText("Would a self-help module be useful?")).toBeTruthy();
});
