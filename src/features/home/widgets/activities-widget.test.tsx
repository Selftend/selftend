import { screen } from "@testing-library/react-native";

import { ActivitiesWidget } from "@/src/features/home/widgets/activities-widget";
import { useActivities } from "@/src/features/activities/queries";
import type { ActivityLog } from "@/src/features/activities/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/stores/selected-date-store", () => {
  const actual = jest.requireActual("@/src/stores/selected-date-store");
  return { ...actual, useSelectedDate: jest.fn() };
});

const mockUseActivities = jest.mocked(useActivities);
const mockUseSelectedDate = jest.mocked(useSelectedDate);

// The jest runner pins TZ to Asia/Kolkata (+05:30). 19:00Z on the 15th is already
// 00:30 on the 16th here, but midday on the 15th at UTC-7 - one instant, two days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";
const UTC_MINUS_7 = -420;

const NO_ACTIVITIES = "No activities scheduled for today.";

function planned(scheduledOffsetMinutes: number | null): ActivityLog {
  return {
    id: "a-1",
    userId: "user-1",
    activityName: "Walk the long way home",
    category: "pleasure",
    paceCategory: null,
    scheduledAt: ACROSS_MIDNIGHT_AT,
    scheduledOffsetMinutes,
    scheduledDayKey: entryDayKey(ACROSS_MIDNIGHT_AT, scheduledOffsetMinutes),
    completedAt: null,
    completedOffsetMinutes: null,
    completedDayKey: null,
    moodBefore: null,
    moodAfter: null,
    notes: "",
    createdAt: ACROSS_MIDNIGHT_AT,
    updatedAt: ACROSS_MIDNIGHT_AT,
  };
}

function renderOn(dayKey: string, activities: ActivityLog[]) {
  mockUseSelectedDate.mockReturnValue({ selectedDate: dayKey, isToday: true });
  mockUseActivities.mockReturnValue({ data: activities } as unknown as ReturnType<
    typeof useActivities
  >);
  renderWithProviders(<ActivitiesWidget userId="user-1" />);
}

// Named HabitsWidget until #330; it reads CBT behavioural-activation activities.
describe("ActivitiesWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists a plan on the day it was made for, not the day the instant falls on", () => {
    // Planned for midday on the 15th at UTC-7. The viewer is in Kolkata, where that
    // instant is already the 16th - the plan must stay on the 15th (#330).
    renderOn(CAPTURED_DAY, [planned(UTC_MINUS_7)]);
    expect(screen.getByText("Walk the long way home")).toBeTruthy();
    expect(screen.getByText("0 / 1")).toBeTruthy();
  });

  it("does not show the plan on the viewer's day when it belongs to another one", () => {
    renderOn(VIEWER_DAY, [planned(UTC_MINUS_7)]);
    expect(screen.queryByText("Walk the long way home")).toBeNull();
    expect(screen.getByText(NO_ACTIVITIES)).toBeTruthy();
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    // Null means "unknown", never "UTC" (#250): the plan keeps rendering exactly
    // where it did before the column existed.
    renderOn(VIEWER_DAY, [planned(null)]);
    expect(screen.getByText("Walk the long way home")).toBeTruthy();
  });
});
