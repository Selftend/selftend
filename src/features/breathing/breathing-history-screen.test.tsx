import { screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BreathingHistoryScreen from "@/src/features/breathing/breathing-history-screen";
import { useBreathingSessionPages } from "@/src/features/breathing/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => true), back: jest.fn() },
  usePathname: () => "/tools/breathing/history",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessionPages: jest.fn(),
}));

jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: [] }),
}));

const mockPages = useBreathingSessionPages as jest.MockedFunction<typeof useBreathingSessionPages>;

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
  } as unknown as ReturnType<typeof useBreathingSessionPages>);
}

function session(over: Record<string, unknown> = {}) {
  return {
    id: "s1",
    userId: "user-1",
    exerciseName: "box-breathing",
    durationMinutes: 2,
    durationSeconds: 96,
    cycles: 6,
    reflection: "",
    moodAfter: null,
    feelingAfter: null,
    completedAt: "2026-05-28T10:00:00Z",
    completedOffsetMinutes: 0,
    createdAt: "2026-05-28T10:00:00Z",
    ...over,
  };
}

describe("Breathing all-sessions screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  it("renders each session with its pattern, cycles and elapsed time", () => {
    pages({ data: { pages: [[session()]], pageParams: [0] } });
    renderWithProviders(<BreathingHistoryScreen />);

    expect(screen.getByText("Box breathing")).toBeTruthy();
    expect(screen.getByText("6 cycles")).toBeTruthy();
    expect(screen.getByText("1:36")).toBeTruthy(); // formatClock(96)
  });

  it("flattens every loaded page rather than showing only the last", () => {
    pages({
      data: {
        pages: [[session({ id: "a" })], [session({ id: "b" }), session({ id: "c" })]],
        pageParams: [0, 20],
      },
    });
    renderWithProviders(<BreathingHistoryScreen />);
    expect(screen.getAllByText("Box breathing")).toHaveLength(3);
  });

  it("says nothing about emptiness while the first page is in flight", () => {
    // "No sessions yet" is a claim about the account. Making it during the first
    // fetch tells a returning user their history is gone.
    pages({ isPending: true });
    renderWithProviders(<BreathingHistoryScreen />);

    expect(screen.queryByText("No sessions yet")).toBeNull();
    expect(screen.queryByText("Couldn't load your sessions")).toBeNull();
  });

  it("distinguishes a failed load from an empty account", () => {
    pages({ isError: true });
    renderWithProviders(<BreathingHistoryScreen />);

    expect(screen.getByText("Couldn't load your sessions")).toBeTruthy();
    expect(screen.queryByText("No sessions yet")).toBeNull();
  });

  it("claims emptiness only once a page has actually come back empty", () => {
    pages({ data: { pages: [[]], pageParams: [0] } });
    renderWithProviders(<BreathingHistoryScreen />);

    expect(screen.getByText("No sessions yet")).toBeTruthy();
    expect(screen.queryByText("Couldn't load your sessions")).toBeNull();
  });

  it("renders the aqua room", () => {
    pages({ data: { pages: [[session()]], pageParams: [0] } });
    renderWithProviders(<BreathingHistoryScreen />);
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });
});
