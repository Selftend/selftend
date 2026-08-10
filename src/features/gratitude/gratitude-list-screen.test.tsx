import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import GratitudeListScreen from "@/src/features/gratitude/gratitude-list-screen";
import { useGratitudeEntryPages } from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";
import { entryDayKey } from "@/src/lib/occurrence-time";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/gratitude-log",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  ...jest.requireActual("@/src/features/gratitude/queries"),
  useGratitudeEntryPages: jest.fn(),
}));

const mockUseGratitudeEntryPages = useGratitudeEntryPages as jest.MockedFunction<
  typeof useGratitudeEntryPages
>;
const mockRouter = jest.mocked(router);

describe("GratitudeListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGratitudeEntryPages.mockReturnValue({
      data: { pages: [[]], pageParams: [null] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isPending: false,
      refetch: jest.fn(),
    } as never);
  });

  it("renders the empty state when there are no entries", () => {
    renderWithProviders(<GratitudeListScreen />);

    expect(screen.getByText("Gratitude")).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Notice something")).toBeTruthy();
    // The root carries the think room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });

  it("renders paged entries as compact rows", () => {
    mockUseGratitudeEntryPages.mockReturnValue({
      data: {
        pages: [
          [
            {
              id: "g-1",
              userId: "user-1",
              level: 3,
              items: ["Warm coffee", "Sunlight"],
              events: [],
              goodMoment: "",
              missIfGone: "",
              hiddenGood: "",
              lifeItems: [],
              starred: false,
              note: "The morning felt steady.",
              loggedAt: "2026-05-24T08:00:00.000Z",
              loggedOffsetMinutes: null,
              dayKey: entryDayKey("2026-05-24T08:00:00.000Z", null),
              createdAt: "2026-05-24T08:00:00.000Z",
              updatedAt: "2026-05-24T08:00:00.000Z",
            },
          ],
        ],
        pageParams: [null],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isPending: false,
      refetch: jest.fn(),
    } as never);

    renderWithProviders(<GratitudeListScreen />);

    expect(screen.getByText("Warm coffee")).toBeTruthy();
    expect(screen.getByText("Sunlight · The morning felt steady.")).toBeTruthy();
    expect(screen.queryByText("Load 5 more")).toBeNull();
  });

  it("distinguishes a failed first page from an empty history", () => {
    mockUseGratitudeEntryPages.mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: true,
      isFetchingNextPage: false,
      isPending: false,
      refetch: jest.fn(),
    } as never);

    renderWithProviders(<GratitudeListScreen />);

    expect(screen.getByText("Entries could not be loaded")).toBeTruthy();
    expect(screen.queryByText("Nothing here yet")).toBeNull();
  });

  it("routes to /tools/gratitude-log/new when the CTA is pressed", () => {
    renderWithProviders(<GratitudeListScreen />);

    fireEvent.press(screen.getByText("Notice something"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log/new");
  });
});
