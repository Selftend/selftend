import { screen } from "@testing-library/react-native";

import GroundingHistoryScreen from "@/src/features/grounding/grounding-history-screen";
import { useGroundingSessionPages } from "@/src/features/grounding/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => true), back: jest.fn() },
  usePathname: () => "/tools/grounding/history",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/grounding/queries", () => ({
  useGroundingSessionPages: jest.fn(),
}));

const mockPages = useGroundingSessionPages as jest.MockedFunction<typeof useGroundingSessionPages>;

function pages(over: Record<string, unknown> = {}) {
  mockPages.mockReturnValue({
    data: undefined,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: jest.fn(),
    ...over,
  } as unknown as ReturnType<typeof useGroundingSessionPages>);
}

const session = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "user-1",
  exerciseName: "cold-water",
  durationMinutes: 1,
  reflection: "",
  moodAfter: null,
  feelingAfter: null,
  completedAt: "2026-05-28T10:00:00Z",
  completedOffsetMinutes: 0,
  dayKey: "2026-05-28",
  createdAt: "2026-05-28T10:00:00Z",
  cycles: null,
  durationSeconds: null,
  stepsCompleted: 2,
  stepsTotal: 4,
  ...over,
});

describe("Grounding all-sessions screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  it("shows partial progress without failure framing", () => {
    pages({ data: { pages: [[session()]], pageParams: [null] } });
    renderWithProviders(<GroundingHistoryScreen />);
    expect(screen.getByText("Cold water")).toBeTruthy();
    expect(screen.getByText("2 of 4")).toBeTruthy();
  });

  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [[session({ id: "a" })], [session({ id: "b" }), session({ id: "c" })]],
        pageParams: [null, {}],
      },
    });
    renderWithProviders(<GroundingHistoryScreen />);
    expect(screen.getAllByText("Cold water")).toHaveLength(3);
  });

  it("distinguishes loading, failure, and a loaded empty history", () => {
    pages({ isPending: true });
    const loading = renderWithProviders(<GroundingHistoryScreen />);
    expect(screen.queryByText("No sessions yet")).toBeNull();
    loading.unmount();

    pages({ isError: true });
    const failed = renderWithProviders(<GroundingHistoryScreen />);
    expect(screen.getByText("Sessions could not be loaded")).toBeTruthy();
    failed.unmount();

    pages({ data: { pages: [[]], pageParams: [null] } });
    renderWithProviders(<GroundingHistoryScreen />);
    expect(screen.getByText("No sessions yet")).toBeTruthy();
  });
});
