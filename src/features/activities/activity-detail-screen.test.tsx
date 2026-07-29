import { screen } from "@testing-library/react-native";

import ActivityDetailScreen from "@/app/(app)/modules/cbt/activities/[id]";
import { useActivity } from "@/src/features/activities/queries";
import { formatAtOffset } from "@/src/utils/date";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ id: "activity-1" }),
  usePathname: () => "/modules/cbt/activities/activity-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useActivity: jest.fn(),
}));

const mockUseActivity = jest.mocked(useActivity);

// 18:00 entered at UTC+3 - stored as the 15:00Z instant plus the captured offset.
const activity = {
  id: "activity-1",
  activityName: "Evening walk",
  category: "physical",
  scheduledAt: "2026-07-30T15:00:00+00:00",
  scheduledOffsetMinutes: 180,
  completedAt: null,
  notes: "",
  moodBefore: null,
  moodAfter: null,
};

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseActivity.mockReturnValue({
    data: activity,
    isLoading: false,
  } as unknown as ReturnType<typeof useActivity>);
});

describe("ActivityDetailScreen schedule formatting", () => {
  it("shows the schedule in the captured frame, not the raw UTC ISO string", () => {
    renderWithProviders(<ActivityDetailScreen />);

    // The human-formatted captured-frame time (reads as the 18:00 the user typed).
    expect(screen.getByText(formatAtOffset(activity.scheduledAt, 180, "en"))).toBeTruthy();
    // The raw machine string must be gone.
    expect(screen.queryByText("2026-07-30T15:00:00+00:00")).toBeNull();
  });
});
