import { screen } from "@testing-library/react-native";

import MeditationSessionDetailScreen from "@/src/features/meditation/meditation-session-detail-screen";
import { useMeditationSession } from "@/src/features/meditation/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: "s1" }),
  usePathname: () => "/tools/meditation/sessions/s1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSession: jest.fn(),
}));

const mockUseMeditationSession = useMeditationSession as jest.MockedFunction<
  typeof useMeditationSession
>;

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  durationMinutes: 20,
  stageAtSession: 2,
  completedAt: "2026-05-28T10:00:00Z",
  createdAt: "2026-05-28T10:00:00Z",
  techniqueUsed: null,
  mindWanderingEpisodes: null,
  dullnessLevel: null,
  distractionLevel: null,
  moodAfter: null,
  reflection: null,
  obstacleTags: [],
  ...overrides,
});

const setSession = (data: unknown, isLoading = false) =>
  mockUseMeditationSession.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useMeditationSession
  >);

describe("MeditationSessionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession(undefined, true);
  });

  it("renders the session's stage and duration", () => {
    setSession(session({ reflection: "Steadier today.", obstacleTags: ["restlessness"] }));

    renderWithProviders(<MeditationSessionDetailScreen />);

    expect(screen.getByRole("heading", { name: "Session detail" })).toBeTruthy();
    expect(screen.getByText("Stage at sit: 2")).toBeTruthy();
    expect(screen.getByText("Steadier today.")).toBeTruthy();
    expect(screen.getByText("restlessness")).toBeTruthy();
  });

  it("shows the not-found heading when the session is missing", () => {
    setSession(undefined, false);

    renderWithProviders(<MeditationSessionDetailScreen />);

    expect(screen.getByRole("heading", { name: "Session not found." })).toBeTruthy();
  });
});
