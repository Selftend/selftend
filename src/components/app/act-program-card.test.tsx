import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ActProgramCard } from "./act-program-card";
import type { ActProgramView, CurrentActPhaseView } from "@/src/features/act/derive-act-program";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

jest.mock("@rn-primitives/popover");

const foundationPhase: CurrentActPhaseView = {
  key: "foundation",
  themeLabelKey: "program.phases.foundation.title",
  themeSubKey: "program.phases.foundation.sub",
  themeDescKey: "program.phases.foundation.description",
  milestones: [
    {
      key: "mapChoicePoint",
      labelKey: "program.tasks.mapChoicePoint",
      route: "/modules/act/choice-point/new",
      current: 1,
      target: 1,
      done: true,
    },
  ],
  dailyPractice: {
    key: "dropAnchorDaily",
    labelKey: "program.tasks.dropAnchorDaily",
    route: "/modules/act/connection/drop-anchor",
    current: 0,
    target: 1,
    done: false,
  },
};

const foundationPhaseNotReady: CurrentActPhaseView = {
  ...foundationPhase,
  milestones: [{ ...foundationPhase.milestones[0], current: 0, done: false }],
};

function makeProgram(overrides: Partial<ActProgramView>): ActProgramView {
  return {
    status: "in_progress",
    startedAt: "2026-05-01T00:00:00Z",
    summaryStats: { choicePoints: 0, defusionLogs: 0, expansionLogs: 0, committedActions: 0 },
    phaseIndex: 0,
    totalPhases: 4,
    isLastPhase: false,
    phase: foundationPhase,
    phaseReady: true,
    ...overrides,
  };
}

describe("ActProgramCard", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("in_progress with phaseReady=true", () => {
    it("shows the ready banner and advance CTA, pressing advance calls onAdvance directly", () => {
      const onAdvance = jest.fn();
      renderWithProviders(
        <ActProgramCard
          program={makeProgram({ phaseReady: true, phase: foundationPhase })}
          onStart={jest.fn()}
          onAdvance={onAdvance}
        />,
      );

      // Ready banner is visible
      expect(screen.getByText("You've finished this phase - ready for the next?")).toBeTruthy();

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
        <ActProgramCard
          program={makeProgram({ phaseReady: true, isLastPhase: true, phase: foundationPhase })}
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
        <ActProgramCard
          program={makeProgram({ phaseReady: false, phase: foundationPhaseNotReady })}
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
        <ActProgramCard
          program={makeProgram({ phaseReady: false, phase: foundationPhaseNotReady })}
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
        <ActProgramCard
          program={makeProgram({ phaseReady: true, phase: foundationPhase })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );

      // "This phase" section label
      expect(screen.getByText("This phase")).toBeTruthy();

      // Milestone row is rendered
      const milestoneRow = screen.getByText("Map your first choice point");
      expect(milestoneRow).toBeTruthy();
      fireEvent.press(milestoneRow);
      expect(router.push).toHaveBeenCalledWith("/modules/act/choice-point/new");
    });

    it("renders the daily practice row and routes on press", () => {
      renderWithProviders(
        <ActProgramCard
          program={makeProgram({ phaseReady: true, phase: foundationPhase })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );

      expect(screen.getByText("Today's practice")).toBeTruthy();
      const practiceRow = screen.getByText("Drop anchor today");
      fireEvent.press(practiceRow);
      expect(router.push).toHaveBeenCalledWith("/modules/act/connection/drop-anchor");
    });
  });

  describe("not_started", () => {
    it("shows the start CTA and calls onStart when pressed", () => {
      const onStart = jest.fn();
      renderWithProviders(
        <ActProgramCard
          program={makeProgram({ status: "not_started", phase: null, phaseReady: false })}
          onStart={onStart}
          onAdvance={jest.fn()}
        />,
      );

      expect(screen.getByText("Start the ACT program")).toBeTruthy();
      expect(screen.getByText("Start the program")).toBeTruthy();

      fireEvent.press(screen.getByText("Start the program"));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("calls onDismissStart when the dismiss button is pressed", () => {
      const onDismissStart = jest.fn();
      renderWithProviders(
        <ActProgramCard
          program={makeProgram({ status: "not_started", phase: null, phaseReady: false })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
          onDismissStart={onDismissStart}
        />,
      );

      fireEvent.press(screen.getByLabelText("Dismiss program invitation"));
      expect(onDismissStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("graduated", () => {
    it("renders null when graduated", () => {
      const { toJSON } = renderWithProviders(
        <ActProgramCard
          program={makeProgram({ status: "graduated", phase: null })}
          onStart={jest.fn()}
          onAdvance={jest.fn()}
        />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe("polished in-progress hero", () => {
    it("renders eyebrow + tinted advance button (in-progress)", () => {
      renderWithProviders(
        <ActProgramCard
          program={makeProgram({ phaseIndex: 0 })}
          onStart={() => {}}
          onAdvance={() => {}}
        />,
      );
      // Eyebrow renders the heroTitle (uppercased visually by Text variant="eyebrow")
      expect(screen.getByText(/act program/i)).toBeTruthy();
    });
  });
});
