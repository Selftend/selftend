import { screen } from "@testing-library/react-native";

import { BreathingWidget } from "@/src/features/home/widgets/breathing-widget";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessions: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockUseBreathingSessions = jest.mocked(useBreathingSessions);
const mockUseSelectedDate = jest.mocked(useSelectedDate);

// The jest runner pins TZ to Asia/Kolkata (+05:30). 19:00Z on the 15th is already
// 00:30 on the 16th here, but midday on the 15th at UTC-7 - one instant, two days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";

function session(completedOffsetMinutes: number | null): MindfulnessSession {
  return {
    id: "ms-1",
    userId: "user-1",
    exerciseName: "box-breathing",
    durationMinutes: 4,
    reflection: "",
    moodAfter: null,
    feelingAfter: null,
    completedAt: ACROSS_MIDNIGHT_AT,
    completedOffsetMinutes,
    dayKey: entryDayKey(ACROSS_MIDNIGHT_AT, completedOffsetMinutes),
    createdAt: ACROSS_MIDNIGHT_AT,
    cycles: 4,
    durationSeconds: 240,
  };
}

function renderOn(dayKey: string, sessions: MindfulnessSession[]) {
  mockUseSelectedDate.mockReturnValue({ selectedDate: dayKey, isToday: true });
  mockUseBreathingSessions.mockReturnValue({ data: sessions } as unknown as ReturnType<
    typeof useBreathingSessions
  >);
  renderWithProviders(<BreathingWidget userId="user-1" />);
}

describe("BreathingWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks the captured day done, not the day the instant falls on for the viewer", () => {
    // Session finished at midday at UTC-7 on the 15th. The viewer is in Kolkata,
    // where that instant is already the 16th - the badge must follow the 15th (#330).
    renderOn(CAPTURED_DAY, [session(-420)]);
    expect(screen.getByText("Done today")).toBeTruthy();
  });

  it("does not credit the viewer's day when the session belongs to another one", () => {
    renderOn(VIEWER_DAY, [session(-420)]);
    expect(screen.queryByText("Done today")).toBeNull();
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    // Null means "unknown", never "UTC" (#250): the session keeps rendering exactly
    // where it did before the column existed.
    renderOn(VIEWER_DAY, [session(null)]);
    expect(screen.getByText("Done today")).toBeTruthy();
  });
});
