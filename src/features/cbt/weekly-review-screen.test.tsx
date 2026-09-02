import { screen } from "@testing-library/react-native";

import WeeklyReviewScreen from "@/app/(app)/modules/cbt/weekly-review";
import { useActivities } from "@/src/features/activities/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useGoals, useMilestones } from "@/src/features/goals/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  usePathname: () => "/modules/cbt/weekly-review",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: jest.fn(),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
  useMilestones: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

/** A settled, empty query result in the shape the named hook returns. */
const loaded = { data: [], isLoading: false };

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useMoodLogs).mockReturnValue(loaded as unknown as ReturnType<typeof useMoodLogs>);
  jest.mocked(useActivities).mockReturnValue(loaded as unknown as ReturnType<typeof useActivities>);
  jest.mocked(useGoals).mockReturnValue(loaded as unknown as ReturnType<typeof useGoals>);
  jest.mocked(useMilestones).mockReturnValue(loaded as unknown as ReturnType<typeof useMilestones>);
  jest
    .mocked(useThoughtRecords)
    .mockReturnValue(loaded as unknown as ReturnType<typeof useThoughtRecords>);
});

describe("WeeklyReviewScreen reflection prompt", () => {
  // With no mood logs the seven-day window ends on "now", so the week-start
  // day of month is now minus six days. The retired pick was
  // `weekStart.dayOfMonth % 4`: a now of the 7th (week start the 1st) and of
  // the 8th (week start the 2nd) rendered two different questions, neither of
  // them the pinned one - content that changes on a calendar rule the user
  // cannot see is a schedule, not a library (#1665, #765). The retired strings
  // are gone from every locale, so there is nothing to assert absent.
  it.each(["2026-09-07T12:00:00", "2026-09-08T12:00:00"])(
    "pins one reflection prompt - the same question when now is %s (#1689)",
    (now) => {
      jest.useFakeTimers({ now: new Date(now) });
      try {
        renderWithProviders(<WeeklyReviewScreen />);

        expect(
          screen.getByText("What is one thing that went better than expected this week?"),
        ).toBeTruthy();
      } finally {
        jest.useRealTimers();
      }
    },
  );
});
