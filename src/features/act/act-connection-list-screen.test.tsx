import { fireEvent, screen } from "@testing-library/react-native";

import ActConnectionListScreen from "@/src/features/act/act-connection-list-screen";
import { useConnectionLogPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/connection",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useConnectionLogPages: jest.fn(),
}));

const mockPages = useConnectionLogPages as jest.MockedFunction<typeof useConnectionLogPages>;

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
  } as unknown as ReturnType<typeof useConnectionLogPages>);
}

const log = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "user-1",
  technique: "noticeFiveThings",
  activityContext: "",
  noticesFromSenses: "a notice",
  durationMinutes: null,
  moodAfter: null,
  notes: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActConnectionListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **The inverse of the test it replaces.** The old assertion pinned the day filter
   * #1517 removes — see the defusion screen's test for the full reasoning.
   */
  it("renders entries written on other days, not just today's", () => {
    pages({
      data: {
        pages: [
          [
            log({ id: "today", noticesFromSenses: "today notice" }),
            log({
              id: "old",
              noticesFromSenses: "old notice",
              createdAt: "2026-05-20T09:00:00.000Z",
            }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActConnectionListScreen />);

    expect(screen.getByText("today notice")).toBeTruthy();
    expect(screen.getByText("old notice")).toBeTruthy();
  });

  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [
          [log({ id: "p1", noticesFromSenses: "page one notice" })],
          [log({ id: "p2", noticesFromSenses: "page two notice" })],
        ],
        pageParams: [null, { timestamp: "2026-05-24T09:00:00.000Z", id: "p1" }],
      },
    });

    renderWithProviders(<ActConnectionListScreen />);

    expect(screen.getByText("page one notice")).toBeTruthy();
    expect(screen.getByText("page two notice")).toBeTruthy();
  });

  /**
   * Drop anchor writes a connection log rather than a record type of its own, so its
   * entries become reachable through this archive — #1517's reason for leaving it off
   * the coverage list as a separate feed.
   */
  it("carries drop-anchor entries, which have no list of their own", () => {
    pages({
      data: {
        pages: [[log({ id: "anchor", technique: "dropAnchor", noticesFromSenses: "" })]],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActConnectionListScreen />);

    expect(screen.getAllByText("Drop anchor (ACE)").length).toBeGreaterThan(0);
  });

  /** ☠️ A failed read must not read as an empty history — see the defusion screen's test. */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActConnectionListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText(
        'No entries yet. Try "Notice Five Things" the next time your mind drifts.',
      ),
    ).toBeNull();
  });

  // The header help door (#1543): the label `HelpButton` composes is what pins
  // this door to the `connection` key, and the sheet's own rendering is pinned
  // in `help-sheet.test.tsx`.
  it("opens the connection help sheet from the header", () => {
    pages({ data: { pages: [[]], pageParams: [null] } });

    renderWithProviders(<ActConnectionListScreen />);

    fireEvent.press(screen.getByLabelText("Help: Connection"));

    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });
});
