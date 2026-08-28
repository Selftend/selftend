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
});
