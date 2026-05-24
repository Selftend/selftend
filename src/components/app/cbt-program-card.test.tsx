import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { CbtProgramCard } from "./cbt-program-card";
import type { CbtProgramView, CurrentPhaseView } from "@/src/features/cbt/derive-program";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@rn-primitives/popover");

const assessmentPhase: CurrentPhaseView = {
  key: "assessment",
  themeLabelKey: "program.weeks.assessment.title",
  themeSubKey: "program.weeks.assessment.sub",
  themeDescKey: "program.weeks.assessment.description",
  milestones: [
    {
      key: "setGoals",
      labelKey: "program.tasks.setGoals",
      route: "/modules/cbt/goals/new",
      current: 1,
      target: 1,
      done: true,
    },
    {
      key: "clarifyValues",
      labelKey: "program.tasks.clarifyValues",
      route: "/modules/cbt/values" as never,
      current: 1,
      target: 1,
      done: true,
    },
  ],
  dailyPractice: {
    key: "dailyNoticing",
    labelKey: "program.tasks.dailyNoticing",
    route: "/tools/mood-tracker/new",
    current: 0,
    target: 1,
    done: false,
  },
};

const assessmentPhaseNotReady: CurrentPhaseView = {
  ...assessmentPhase,
  milestones: [
    { ...assessmentPhase.milestones[0], current: 0, done: false },
    { ...assessmentPhase.milestones[1], current: 0, done: false },
  ],
};

function makeProgram(overrides: Partial<CbtProgramView>): CbtProgramView {
  return {
    status: "in_progress",
    startedAt: "2026-05-01T00:00:00Z",
    summaryStats: { thoughtRecords: 0, activitiesCompleted: 0, goalsSet: 0, beliefsExamined: 0 },
    phaseIndex: 0,
    totalPhases: 5,
    isLastPhase: false,
    phase: assessmentPhase,
    phaseReady: true,
    ...overrides,
  };
}

describe("CbtProgramCard", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("in_progress with phaseReady=true", () => {
    it("shows the ready banner and advance CTA, pressing advance calls onAdvance directly", () => {
      const onAdvance = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: true, phase: assessmentPhase })}
          onStart={jest.fn()}
          onAdvance={onAdvance}
        />,
      );

      // Ready banner is visible
      expect(screen.getByText("You've finished this phase — ready for the next?")).toBeTruthy();

      // Advance button is visible
      const advanceBtn = screen.getByText("Advance to next phase");
      expect(advanceBtn).toBeTruthy();

      // Pressing it calls onAdvance directly (no dialog)
      fireEvent.press(advanceBtn);
      expect(onAdvance).toHaveBeenCalledTimes(1);
    });

    it("shows 'Finish the program' as the advance label on the last phase", () => {
      const onAdvance = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: true, isLastPhase: true, phase: assessmentPhase })}
          onStart={jest.fn()}
          onAdvance={onAdvance}
        />,
      );

      const graduateBtn = screen.getByText("Finish the program");
      expect(graduateBtn).toBeTruthy();
      fireEvent.press(graduateBtn);
      expect(onAdvance).toHaveBeenCalledTimes(1);
    });
  });

  describe("in_progress with phaseReady=false", () => {
    it("pressing advance opens the early-advance confirm dialog, confirming calls onAdvance", () => {
      const onAdvance = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: false, phase: assessmentPhaseNotReady })}
          onStart={jest.fn()}
          onAdvance={onAdvance}
        />,
      );

      // No confirm dialog yet
      expect(screen.queryByText("Advance anyway?")).toBeNull();

      // Press the advance button
      fireEvent.press(screen.getByText("Advance to next phase"));

      // Confirm dialog appears
      expect(screen.getByText("Advance anyway?")).toBeTruthy();
      expect(
        screen.getByText("You haven't finished this phase's steps yet. Move on anyway?"),
      ).toBeTruthy();

      // Confirm
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      expect(onAdvance).toHaveBeenCalledTimes(1);
    });

    it("cancelling the early-advance dialog does not call onAdvance", () => {
      const onAdvance = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: false, phase: assessmentPhaseNotReady })}
          onStart={jest.fn()}
          onAdvance={onAdvance}
        />,
      );

      fireEvent.press(screen.getByText("Advance to next phase"));
      expect(screen.getByText("Advance anyway?")).toBeTruthy();

      fireEvent.press(screen.getByText("Not yet"));
      expect(onAdvance).not.toHaveBeenCalled();
      // Dialog should be gone
      expect(screen.queryByText("Advance anyway?")).toBeNull();
    });
  });

  describe("milestone and practice rows", () => {
    it("renders milestone rows and routes on press", () => {
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: true, phase: assessmentPhase })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );

      // "This phase" section label
      expect(screen.getByText("This phase")).toBeTruthy();

      // Milestone row is rendered
      const goalRow = screen.getByText("Set 1-2 goals");
      expect(goalRow).toBeTruthy();
      fireEvent.press(goalRow);
      expect(router.push).toHaveBeenCalledWith("/modules/cbt/goals/new");
    });

    it("renders the daily practice row and routes on press", () => {
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ phaseReady: true, phase: assessmentPhase })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );

      expect(screen.getByText("Today's practice")).toBeTruthy();
      const practiceRow = screen.getByText("Notice your thoughts, feelings & behaviours today");
      fireEvent.press(practiceRow);
      expect(router.push).toHaveBeenCalledWith("/tools/mood-tracker/new");
    });
  });

  describe("not_started", () => {
    it("shows the start CTA and calls onStart when pressed", () => {
      const onStart = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ status: "not_started", phase: null, phaseReady: false })}
          onStart={onStart}
          onAdvance={jest.fn()}
        />,
      );

      expect(screen.getByText("Your CBT program")).toBeTruthy();
      expect(screen.getByText("Start program")).toBeTruthy();

      fireEvent.press(screen.getByText("Start program"));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("calls onDismissStart when the dismiss button is pressed", () => {
      const onDismissStart = jest.fn();
      renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ status: "not_started", phase: null, phaseReady: false })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
          onDismissStart={onDismissStart}
        />,
      );

      fireEvent.press(screen.getByLabelText("Hide the program invitation"));
      expect(onDismissStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("graduated", () => {
    it("renders null when graduated", () => {
      const { toJSON } = renderWithProviders(
        <CbtProgramCard
          program={makeProgram({ status: "graduated", phase: null })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );
      expect(toJSON()).toBeNull();
    });
  });
});
