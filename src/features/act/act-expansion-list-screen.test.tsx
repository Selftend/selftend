import { fireEvent, screen } from "@testing-library/react-native";

import ActExpansionListScreen from "@/src/features/act/act-expansion-list-screen";
import { useExpansionLogPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/expansion",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useExpansionLogPages: jest.fn(),
}));

const mockPages = useExpansionLogPages as jest.MockedFunction<typeof useExpansionLogPages>;

function pages(over: Record<string, unknown> = {}) {
  mockPages.mockReturnValue({
    data: undefined,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    isPending: false,
    refetch: jest.fn(),
    ...over,
  } as unknown as ReturnType<typeof useExpansionLogPages>);
}

const log = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "user-1",
  emotion: "an emotion",
  bodySensation: "",
  intensityBefore: null,
  intensityAfter: null,
  struggleSwitchOn: null,
  discomfortType: null,
  techniqueUsed: "fourStepExpansion",
  notes: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActExpansionListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **The inverse of the test it replaces.** The old assertion pinned the day filter
   * #1517 removes: this screen kept only entries whose `createdAt` matched a
   * `useSelectedDate()` that returns today and has no setter, so yesterday's acceptance
   * work was unreachable from the only screen that lists it.
   */
  it("renders entries written on other days, not just today's", () => {
    pages({
      data: {
        pages: [
          [
            log({ id: "today", emotion: "today emotion" }),
            log({ id: "old", emotion: "old emotion", createdAt: "2026-05-20T09:00:00.000Z" }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("today emotion")).toBeTruthy();
    expect(screen.getByText("old emotion")).toBeTruthy();
  });

  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [
          [log({ id: "p1", emotion: "page one emotion" })],
          [log({ id: "p2", emotion: "page two emotion" })],
        ],
        pageParams: [null, { timestamp: "2026-05-24T09:00:00.000Z", id: "p1" }],
      },
    });

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("page one emotion")).toBeTruthy();
    expect(screen.getByText("page two emotion")).toBeTruthy();
  });

  /** ☠️ A failed read must not read as an empty history — see the defusion screen's test. */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText(
        "No entries yet. Use acceptance when a difficult emotion or sensation is present.",
      ),
    ).toBeNull();
  });

  /**
   * ☠️ #1515 made this route the tool's front door as well as its archive, so both write
   * controls have to stay above the entries. They live in the FlatList header for that
   * reason; anything that pushes them below the fold reopens that decision.
   */
  it("keeps both write controls on the screen alongside the archive", () => {
    pages({ data: { pages: [[log({ emotion: "an entry" })]], pageParams: [null] } });

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("Make room for a feeling")).toBeTruthy();
    expect(screen.getByText("Surf an urge")).toBeTruthy();
    expect(screen.getByText("an entry")).toBeTruthy();
  });

  /**
   * The header help door (#1543): the label `HelpButton` composes is what pins
   * this door to the `expansion` key, and the sheet's own rendering is pinned in
   * `help-sheet.test.tsx`.
   *
   * The label reads "Acceptance", not "Expansion": `expansion` is the key, but
   * "Acceptance" is the name this process goes by everywhere the user can see -
   * this screen's own heading included.
   */
  it("opens the acceptance help sheet from the header", () => {
    pages({ data: { pages: [[]], pageParams: [null] } });

    renderWithProviders(<ActExpansionListScreen />);

    fireEvent.press(screen.getByLabelText("Help: Acceptance"));

    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });

  /**
   * ☠️ A later page's failure must not read as the end of the history (#2187).
   * `ListEmptyComponent` renders only while the list is empty, so the `ErrorState` there
   * covers page one alone; TanStack keeps the loaded pages across a failed
   * `fetchNextPage` and flips `isError`, and before this the footer went back to `null` —
   * the list stopped at the last good page with no error and nothing to press. The retry
   * goes through `fetchNextPage`, not a full `refetch`: the loaded pages are fine.
   */
  it("says so and offers a retry when a later page fails, instead of going quiet", () => {
    const fetchNextPage = jest.fn();
    pages({
      data: { pages: [[log({ emotion: "page one emotion" })]], pageParams: [null] },
      hasNextPage: true,
      isError: true,
      isFetchNextPageError: true,
      fetchNextPage,
    });

    renderWithProviders(<ActExpansionListScreen />);

    // The rows already loaded stay, and the page-one error card does not take over.
    expect(screen.getByText("page one emotion")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();

    expect(screen.getByText("Couldn't load more entries.")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  /**
   * ☠️ `isError` alone is the wrong predicate for that footer (#2253). It is also true
   * after a failed REFETCH of the pages already loaded — a focus, reconnect or post-save
   * invalidation re-read that fails while online — where nothing "more" was being
   * loaded. Keyed on it, a complete list said "Couldn't load more entries." and its Retry
   * called `fetchNextPage` with no next page, which resolves the old data without a
   * request and stamps the list fresh. Only `isFetchNextPageError` names a failed page.
   */
  it("keeps the load-more error out of a failed refresh of the loaded pages", () => {
    pages({
      data: { pages: [[log({ emotion: "a loaded emotion" })]], pageParams: [null] },
      hasNextPage: false,
      isError: true,
      isFetchNextPageError: false,
    });

    renderWithProviders(<ActExpansionListScreen />);

    expect(screen.getByText("a loaded emotion")).toBeTruthy();
    expect(screen.queryByText("Couldn't load more entries.")).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});
