import { screen } from "@testing-library/react-native";

import ActChoicePointListScreen from "@/src/features/act/act-choice-point-list-screen";
import { useChoicePointPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/choice-point",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useChoicePointPages: jest.fn(),
}));

const mockPages = useChoicePointPages as jest.MockedFunction<typeof useChoicePointPages>;

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
  } as unknown as ReturnType<typeof useChoicePointPages>);
}

const choicePoint = (over: Record<string, unknown> = {}) => ({
  id: "cp-1",
  userId: "user-1",
  hooks: ["a hook"],
  awayMoves: [],
  towardMoves: [],
  notes: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActChoicePointListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **The inverse of the test it replaces.** The old assertion pinned the day filter
   * #1517 removes — see the defusion screen's test for the full reasoning.
   */
  it("renders choice points mapped on other days, not just today's", () => {
    pages({
      data: {
        pages: [
          [
            choicePoint({ id: "today", hooks: ["today hook"] }),
            choicePoint({
              id: "old",
              hooks: ["old hook"],
              createdAt: "2026-05-20T09:00:00.000Z",
            }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActChoicePointListScreen />);

    expect(screen.getByText("today hook")).toBeTruthy();
    expect(screen.getByText("old hook")).toBeTruthy();
  });

  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [
          [choicePoint({ id: "p1", hooks: ["page one hook"] })],
          [choicePoint({ id: "p2", hooks: ["page two hook"] })],
        ],
        pageParams: [null, { timestamp: "2026-05-24T09:00:00.000Z", id: "p1" }],
      },
    });

    renderWithProviders(<ActChoicePointListScreen />);

    expect(screen.getByText("page one hook")).toBeTruthy();
    expect(screen.getByText("page two hook")).toBeTruthy();
  });

  /** ☠️ A failed read must not read as an empty history — see the defusion screen's test. */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActChoicePointListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText(
        "Map your first choice point to see what hooks you and where you want to go.",
      ),
    ).toBeNull();
  });
});
