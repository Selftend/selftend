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
  usePathname: () => "/tools/mood-tracker/log-1",
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
  createdAt: new Date("2026-05-10T08:00:00.000Z").toISOString(),
  situation: "",
  thoughts: "",
  behaviours: "",
  bodilySensations: "",
};

describe("MoodDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoodLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodLog>);
    mockUseMoodLogs.mockReturnValue({
      data: [MOCK_ENTRY],
    } as unknown as ReturnType<typeof useMoodLogs>);
  });

  it("renders the hero strip with score word, score number, and relative time", () => {
    renderWithProviders(<MoodDetailScreen />);

    // Hero strip: "Good · 4" (detailWord.4 + moodScore)
    expect(screen.getByText("Good · 4")).toBeTruthy();
    // Relative time: 2026-05-10 is 21 days before 2026-05-31
    expect(screen.getByText("21 days ago")).toBeTruthy();
  });

  it("renders Edit and Delete buttons in the hero strip", () => {
    renderWithProviders(<MoodDetailScreen />);

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("routes to the edit page for the selected mood entry", () => {
    renderWithProviders(<MoodDetailScreen />);

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/mood-tracker/log-1/edit");
  });
});
