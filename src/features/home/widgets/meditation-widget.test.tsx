import { screen } from "@testing-library/react-native";

import { MeditationWidget } from "@/src/features/home/widgets/meditation-widget";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import type { MeditationSession } from "@/src/features/meditation/types";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSessions: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockUseMeditationSessions = useMeditationSessions as jest.MockedFunction<
  typeof useMeditationSessions
>;
const mockUseSelectedDate = useSelectedDate as jest.MockedFunction<typeof useSelectedDate>;

const SELECTED_DAY = "2026-07-15";

function session(completedAt: string, dayKey: string): MeditationSession {
  return {
    id: `m-${completedAt}`,
    userId: "user-1",
    stageAtSession: 1,
    durationMinutes: 20,
    completedAt,
    completedOffsetMinutes: null,
    dayKey,
    createdAt: completedAt,
    mindWanderingEpisodes: null,
    dullnessLevel: null,
    distractionLevel: null,
    obstacleTags: [],
    reflection: "",
    moodAfter: null,
    techniqueUsed: null,
  };
}

function renderWithSessions(sessions: MeditationSession[]) {
  mockUseMeditationSessions.mockReturnValue({ data: sessions } as unknown as ReturnType<
    typeof useMeditationSessions
  >);
  renderWithProviders(<MeditationWidget userId="user-1" />);
}

describe("MeditationWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedDate.mockReturnValue({ selectedDate: SELECTED_DAY });
  });

  // The runner sits at Asia/Kolkata (+05:30, pinned in jest.config.js), so these
  // instants deliberately bucket to a different day than the one captured.
  it("badges the day the sit was captured on, not the viewer's day", () => {
    // 19:00 UTC on the 15th: the 15th where the sit happened, the 16th to this
    // viewer. Reading the raw instant would darken the badge on a sit already done.
    renderWithSessions([session("2026-07-15T19:00:00.000Z", SELECTED_DAY)]);

    expect(screen.getByText("Done today")).toBeTruthy();
  });

  it("does not badge a sit captured on another day that lands on this one", () => {
    // The inverse: 01:00 UTC on the 15th is still the 14th in Los Angeles, where
    // it was logged - but 06:30 on the 15th here.
    renderWithSessions([session("2026-07-15T01:00:00.000Z", "2026-07-14")]);

    expect(screen.queryByText("Done today")).toBeNull();
  });

  it("counts every session in the stats regardless of day", () => {
    renderWithSessions([
      session("2026-07-15T19:00:00.000Z", SELECTED_DAY),
      session("2026-07-15T01:00:00.000Z", "2026-07-14"),
    ]);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
  });
});
