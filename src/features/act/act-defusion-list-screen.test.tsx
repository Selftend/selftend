import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import ActDefusionListScreen from "@/src/features/act/act-defusion-list-screen";
import { useDefusionLogPages } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/defusion",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useDefusionLogPages: jest.fn(),
}));

const mockPages = useDefusionLogPages as jest.MockedFunction<typeof useDefusionLogPages>;

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
  } as unknown as ReturnType<typeof useDefusionLogPages>);
}

const log = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  userId: "user-1",
  fusedThought: "a thought",
  thoughtCategory: "selfJudgment",
  techniqueUsed: "havingTheThoughtThat",
  defusedVersion: "",
  fusionLevelBefore: null,
  fusionLevelAfter: null,
  notes: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
  ...over,
});

describe("ActDefusionListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pages();
  });

  /**
   * ☠️ **This test is the inverse of the one it replaces, deliberately.** The old
   * assertion — `queryByText("old thought")).toBeNull()` — pinned the defect #1517 exists
   * to remove: the screen filtered itself to
   * `toLocalDateKey(createdAt) === useSelectedDate()`, and `useSelectedDate()` returns
   * today with no setter anywhere in the app, so an entry written yesterday was
   * unreachable from the only screen that lists defusion logs. The behaviour it pinned
   * was wrong, so the assertion is inverted rather than weakened, and the old
   * `selected-date-store` mock is gone because the screen no longer reads it.
   */
  it("renders entries written on other days, not just today's", () => {
    pages({
      data: {
        pages: [
          [
            log({ id: "today", fusedThought: "today thought" }),
            log({
              id: "old",
              fusedThought: "old thought",
              createdAt: "2026-05-20T09:00:00.000Z",
            }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("today thought")).toBeTruthy();
    expect(screen.getByText("old thought")).toBeTruthy();
  });

  /** Every loaded page is on screen, not just the newest one. */
  it("flattens every loaded page", () => {
    pages({
      data: {
        pages: [
          [log({ id: "p1", fusedThought: "page one thought" })],
          [log({ id: "p2", fusedThought: "page two thought" })],
        ],
        pageParams: [null, { timestamp: "2026-05-24T09:00:00.000Z", id: "p1" }],
      },
    });

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("page one thought")).toBeTruthy();
    expect(screen.getByText("page two thought")).toBeTruthy();
  });

  /**
   * ☠️ A failed read must not read as an empty history. This screen is the complete
   * record of a user's defusion work; "No entries yet" over a network error tells them
   * their own writing is gone.
   */
  it("tells a failed read apart from an empty one", () => {
    pages({ isError: true });

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.queryByText("No entries yet. Use defusion when a sticky thought shows up."),
    ).toBeNull();
  });

  /**
   * The list renders through the shared `DefusionLogRow` (#1388), the same row
   * ACT home shows - so tapping through from home does not change the shape of
   * what the user is reading.
   *
   * ⚠️ Asserts on rendered TEXT and ROUTES only, never on how the list is
   * derived: #1332 owns a rewrite of this screen's filtering, and these
   * assertions must survive it.
   */
  it("renders each log as a shared row: technique, pair on the meta line, no category", () => {
    pages({
      data: {
        pages: [
          [
            log({
              id: "log-1",
              fusedThought: "today thought",
              techniqueUsed: "musicalThoughts",
              fusionLevelBefore: 60,
              fusionLevelAfter: 20,
            }),
          ],
        ],
        pageParams: [null],
      },
    });

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("Musical thoughts")).toBeTruthy();
    expect(screen.queryByText("Self-judgment")).toBeNull();
    expect(screen.getByText("60 → 20")).toBeTruthy();

    fireEvent.press(screen.getByText("today thought"));

    expect(router.push as jest.Mock).toHaveBeenCalledWith({
      pathname: "/modules/act/defusion/[id]",
      params: { id: "log-1" },
    });
  });

  /**
   * The `Also try` row renders through the shared `SharedToolsRow` since #1216
   * (`RelatedTools` died in the merge). The heading survives as this screen's
   * copy, the chip is a link that opens its tool - pinned here at one of the six
   * ACT call sites so the row cannot silently drop out of a screen; the row's
   * own behaviour (role, origin recording, order) is pinned in
   * `shared-tools-row.test.tsx`.
   *
   * ☠️ It sits in the FlatList header, above the list, and that placement is load-bearing:
   * #1515 made this route the tool's front door as well as its archive, so the New button
   * and this row must stay above the entries.
   */
  it("offers the journal under Also try, as a link that opens it", () => {
    pages({ data: { pages: [[]], pageParams: [null] } });

    renderWithProviders(<ActDefusionListScreen />);

    expect(screen.getByText("Also try")).toBeTruthy();

    fireEvent.press(screen.getByRole("link", { name: "Journal" }));

    expect(router.push as jest.Mock).toHaveBeenCalledWith("/tools/journal");
  });

  // The header help door (#1543): the label `HelpButton` composes is what pins
  // this door to the `defusion` key, and the sheet's own rendering is pinned in
  // `help-sheet.test.tsx`.
  it("opens the defusion help sheet from the header", () => {
    pages({ data: { pages: [[]], pageParams: [null] } });

    renderWithProviders(<ActDefusionListScreen />);

    fireEvent.press(screen.getByLabelText("Help: Defusion"));

    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });
});
