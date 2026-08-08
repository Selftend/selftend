import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodDetailScreen from "@/src/features/mood/mood-detail-screen";
import { useMoodLog, useMoodLogs } from "@/src/features/mood/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "log-1" }),
  usePathname: () => "/tools/check-in/log-1",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useDeleteMoodLog: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useMoodLog: jest.fn(),
  useMoodLogs: jest.fn(),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
  useEmotionUsageCounts: () => ({ data: {} }),
}));

const mockUseMoodLog = useMoodLog as jest.MockedFunction<typeof useMoodLog>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockRouter = jest.mocked(router);

const MOCK_ENTRY = {
  id: "log-1",
  userId: "user-1",
  moodScore: 4,
  emotions: ["Anxious"],
  notes: "Felt steadier after a walk",
  linkedStrategy: null,
  loggedAt: new Date("2026-05-10T08:00:00.000Z").toISOString(),
  // Captured one civil day EARLIER than the instant's viewer-local day, so the
  // relative-time assertion below can tell the two frames apart (#433 §2).
  loggedOffsetMinutes: -660,
  dayKey: "2026-05-09",
  createdAt: new Date("2026-05-10T08:00:00.000Z").toISOString(),
  situation: "",
  thoughts: "",
  behaviours: "",
  bodilySensations: "",
};

describe("MoodDetailScreen", () => {
  beforeEach(() => {
    // Freeze only the clock (keep timer fns real so RNTL/react-query are unaffected) so the
    // relative-time assertion below is deterministic regardless of the real run date.
    jest.useFakeTimers({
      now: new Date("2026-05-31T12:00:00.000Z"),
      doNotFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "setImmediate",
        "clearImmediate",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
        "hrtime",
        "nextTick",
        "performance",
      ],
    });
    jest.clearAllMocks();
    mockUseMoodLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodLog>);
    mockUseMoodLogs.mockReturnValue({
      data: [MOCK_ENTRY],
    } as unknown as ReturnType<typeof useMoodLogs>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the hero strip with score word, score number, and relative time", () => {
    renderWithProviders(<MoodDetailScreen />);

    // Hero strip: "Good · 4" (detailWord.4 + moodScore)
    expect(screen.getByText("Good · 4")).toBeTruthy();
    // Relative time follows the CAPTURED day (2026-05-09, 22 days before the
    // frozen 2026-05-31), not the instant's viewer-local day (2026-05-10, which
    // would read "21 days ago").
    expect(screen.getByText("22 days ago")).toBeTruthy();
  });

  it("renders Edit and Delete buttons in the hero strip", () => {
    renderWithProviders(<MoodDetailScreen />);

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("routes to the edit page for the selected mood entry", () => {
    renderWithProviders(<MoodDetailScreen />);

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/log-1/edit");
  });
});
