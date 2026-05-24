import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ProgramHero } from "./program-hero";
import type { ActProgramView } from "@/src/features/act/derive-act-program";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@rn-primitives/popover");

const baseWeek = {
  key: "thinking",
  themeLabelKey: "program.weeks.thinking.title",
  pillar: "bePresent" as const,
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

function view(overrides: Partial<ActProgramView>): ActProgramView {
  return {
    status: "in_progress",
    startedAt: "2026-05-01T00:00:00Z",
    currentWeekIndex: 1,
    totalWeeks: 4,
    weeks: [0, 1, 2, 3].map((index) => ({ ...baseWeek, key: `week-${index}` })),
    weeksComplete: 0,
    allWeeksComplete: false,
    summaryStats: { choicePoints: 0, defusionLogs: 0, expansionLogs: 0, committedActions: 0 },
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

  it("uses ACT help copy when rendered for the ACT namespace", () => {
    renderWithProviders(
      <ProgramHero
        namespace="act"
        program={view({ status: "not_started", weeks: [] })}
        onStart={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Help: The ACT program"));

    expect(
      screen.getByText(
        "A guided 4-week ACT path for practicing psychological flexibility: be present, open up, and do what matters.",
      ),
    ).toBeTruthy();
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

  it("calls onAbandon via the cogwheel menu", () => {
    const onAbandon = jest.fn();
    renderWithProviders(
      <ProgramHero program={view({})} onAbandon={onAbandon} onStart={jest.fn()} />,
    );
    // Abandon option not visible until menu is opened
    expect(screen.queryByText("Abandon program")).toBeNull();
    // Open the cogwheel menu
    fireEvent.press(screen.getByLabelText("Program options"));
    // Abandon option now visible; press it
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

  it("shows the current phase subtitle and description when provided", () => {
    renderWithProviders(
      <ProgramHero
        program={view({
          weeks: [0, 1, 2, 3].map((index) => ({
            ...baseWeek,
            key: `week-${index}`,
            themeSubKey: "program.weeks.assessment.sub",
            themeDescKey: "program.weeks.assessment.description",
          })),
        })}
        onStart={jest.fn()}
      />,
    );
    expect(screen.getByText(/Assessment/)).toBeTruthy();
    expect(
      screen.getByText(
        "Map the problem, set goals, clarify your values, and start noticing how you think, feel and act day to day.",
      ),
    ).toBeTruthy();
  });
});
