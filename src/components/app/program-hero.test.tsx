import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ProgramHero } from "./program-hero";
import type { CbtProgramView } from "@/src/features/cbt/derive-program";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const baseWeek = {
  key: "challengeThinking",
  themeLabelKey: "program.weeks.challengeThinking",
  pillar: "think" as const,
  done: false,
  tasks: [
    {
      key: "thoughtRecordDays",
      labelKey: "program.tasks.thoughtRecordDays",
      route: "/modules/cbt/new" as const,
      current: 1,
      target: 3,
      done: false,
    },
  ],
};

function view(overrides: Partial<CbtProgramView>): CbtProgramView {
  return {
    status: "in_progress",
    startedAt: "2026-05-01T00:00:00Z",
    currentWeekIndex: 1,
    totalWeeks: 4,
    weeks: [baseWeek, baseWeek, baseWeek, baseWeek],
    weeksComplete: 0,
    allWeeksComplete: false,
    summaryStats: { thoughtRecords: 0, activitiesCompleted: 0, goalsSet: 0, beliefsExamined: 0 },
    ...overrides,
  };
}

describe("ProgramHero", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the start card when not started", () => {
    renderWithProviders(
      <ProgramHero program={view({ status: "not_started", weeks: [] })} onStart={jest.fn()} />,
    );
    expect(screen.getByText("Start program")).toBeTruthy();
  });

  it("calls onStart when the start button is pressed", () => {
    const onStart = jest.fn();
    renderWithProviders(
      <ProgramHero program={view({ status: "not_started", weeks: [] })} onStart={onStart} />,
    );
    fireEvent.press(screen.getByText("Start program"));
    expect(onStart).toHaveBeenCalled();
  });

  it("calls onDismissStart when the start card close button is pressed", () => {
    const onDismissStart = jest.fn();
    renderWithProviders(
      <ProgramHero
        program={view({ status: "not_started", weeks: [] })}
        onDismissStart={onDismissStart}
        onStart={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByLabelText("Hide the program invitation"));
    expect(onDismissStart).toHaveBeenCalled();
  });

  it("calls onAbandon from an in-progress program", () => {
    const onAbandon = jest.fn();
    renderWithProviders(
      <ProgramHero program={view({})} onAbandon={onAbandon} onStart={jest.fn()} />,
    );
    fireEvent.press(screen.getByText("Abandon program"));
    expect(onAbandon).toHaveBeenCalled();
  });

  it("renders the current week's tasks and routes on tap", () => {
    renderWithProviders(<ProgramHero program={view({})} onStart={jest.fn()} />);
    fireEvent.press(screen.getByText("Complete a thought record on 3 days"));
    expect(router.push).toHaveBeenCalledWith("/modules/cbt/new");
  });

  it("renders nothing when graduated", () => {
    const { toJSON } = renderWithProviders(
      <ProgramHero program={view({ status: "graduated" })} onStart={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});
