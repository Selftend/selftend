import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { router } from "expo-router";

import HomeScreen from "./today-screen";
import { addFavorite, listFavorites } from "@/src/features/favorites/repository";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // `HomeTour` reads it, and only gates its queue on being at "/".
  usePathname: () => "/",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: { appOnboardingCompleted: false, shownButtonTours: [] } }),
  useUpdateShownButtonTours: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28" }),
}));

/**
 * The repository is the seam, not the queries: Home is rendered against the REAL
 * favourites queries so that "pending", "empty" and "populated" are the states the real
 * query produces, and so that pressing a star moves a card through the real optimistic
 * path rather than a stubbed one.
 */
jest.mock("@/src/features/favorites/repository", () => ({
  listFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
}));

// The eight stat queries are the card's concern, not this screen's.
jest.mock("@/src/features/home/tool-row-stats", () => ({
  ToolStat: () => null,
}));

const mockPush = router.push as jest.Mock;
const mockList = listFavorites as jest.MockedFunction<typeof listFavorites>;
const mockAdd = addFavorite as jest.MockedFunction<typeof addFavorite>;

const EMPTY_LINE = "Star a tool or a module to keep it here.";
const CARD = /^card-(tool|module)-/;

const cardsIn = (testID: string) =>
  within(screen.getByTestId(testID))
    .queryAllByTestId(CARD)
    .map((node) => node.props.testID as string);

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([]);
  mockAdd.mockResolvedValue(undefined);
});

async function renderSettled() {
  renderWithProviders(<HomeScreen />);
  // The favourites query has settled once the Favourites section has a body.
  await waitFor(() => expect(screen.getByTestId("home-favourites").children.length).toBe(2));
}

describe("HomeScreen greeting", () => {
  it("renders the greeting with the date eyebrow", async () => {
    await renderSettled();
    expect(screen.getByText(/good (morning|afternoon|evening)\./i)).toBeTruthy();
  });

  /**
   * The whole of #960 in one assertion, stated as a COUNT on purpose. The obvious form -
   * `queryByTestId("dashboard-sub")).toBeNull()` - passes forever the moment the node it
   * names stops existing. Counting the greeting block's children fails the moment anyone
   * adds a third line, whatever they call it.
   */
  it("renders exactly two elements - eyebrow and h1 - and no third line", async () => {
    await renderSettled();
    expect(screen.getByTestId("home-greeting").children).toHaveLength(2);
  });
});

/**
 * The stack (#1956, spec #1885 §1): greeting → Favourites → Tools → Modules, asserted as
 * structure rather than as the absence of what used to be here. `queryByText("Your
 * tools").toBeNull()` would pass forever now that the string exists nowhere.
 */
describe("HomeScreen stack", () => {
  it("renders the greeting and then exactly three level-2 sections, in order", async () => {
    await renderSettled();

    const headings = screen.getAllByRole("heading").map((node) => node.props.children);
    expect(headings).toHaveLength(4);
    expect(headings.slice(1)).toEqual(["Favourites", "Tools", "Modules"]);

    const sections = screen.UNSAFE_root.findAll((node) =>
      ["home-favourites", "home-tools", "home-modules"].includes(node.props?.testID as string),
    )
      .map((node) => node.props.testID as string)
      // A testID reaches several composite layers; keep first sightings.
      .filter((id, index, all) => all.indexOf(id) === index);
    expect(sections).toEqual(["home-favourites", "home-tools", "home-modules"]);
  });

  it("keeps home-layout under exactly that name", async () => {
    await renderSettled();
    expect(screen.getByTestId("home-layout")).toBeTruthy();
  });

  it("renders all eight tools and all three modules for a user with no favourites", async () => {
    await renderSettled();

    expect(cardsIn("home-tools")).toEqual([
      "card-tool-mood",
      "card-tool-journal",
      "card-tool-breathing",
      "card-tool-gratitude",
      "card-tool-grounding",
      "card-tool-meditation",
      "card-tool-sleep",
      "card-tool-habits",
    ]);
    expect(cardsIn("home-modules")).toEqual([
      "card-module-cbt",
      "card-module-act",
      "card-module-dbt",
    ]);
  });

  it("renders a favourited item under Favourites AND again in its catalogue position", async () => {
    mockList.mockResolvedValue([
      { kind: "module", key: "cbt" },
      { kind: "tool", key: "mood" },
    ]);
    await renderSettled();

    // Catalogue order, not row order; and the catalogue below is unfiltered.
    expect(cardsIn("home-favourites")).toEqual(["card-tool-mood", "card-module-cbt"]);
    expect(cardsIn("home-tools")).toHaveLength(8);
    expect(cardsIn("home-modules")).toHaveLength(3);
    expect(screen.queryByText(EMPTY_LINE)).toBeNull();
  });

  /**
   * ☠️ The Modules section is unconditional — `docs/positioning.md` clause 1. Zero
   * favourites, zero programme state, nothing loaded yet: the three modules are there.
   */
  it("renders the Modules section before the favourites query has settled", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomeScreen />);

    expect(cardsIn("home-modules")).toHaveLength(3);
    expect(cardsIn("home-tools")).toHaveLength(8);
  });
});

describe("HomeScreen empty Favourites", () => {
  it("renders one quiet line, no card, no box and no button once the query settles empty", async () => {
    await renderSettled();

    const favourites = screen.getByTestId("home-favourites");
    expect(within(favourites).getByText(EMPTY_LINE)).toBeTruthy();
    expect(cardsIn("home-favourites")).toEqual([]);
    // Heading + line. A box or a door would be a third child.
    expect(favourites.children).toHaveLength(2);
    expect(within(favourites).queryAllByRole("button")).toEqual([]);
  });

  /**
   * A loading surface never claims emptiness. Before the rows arrive the section is its
   * heading and nothing else — and that is a child COUNT, because "the empty line is
   * absent" would also be true of a section that forgot to render it.
   */
  it("renders the heading alone - not the empty line - while the query is pending", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomeScreen />);

    const favourites = screen.getByTestId("home-favourites");
    expect(favourites.children).toHaveLength(1);
    expect(screen.queryByText(EMPTY_LINE)).toBeNull();
  });
});

describe("HomeScreen controls", () => {
  /**
   * No `Right now`, no `Arrange` / `Add tool`, no empty-state doors, no re-offered
   * wizard: the only buttons on Home are the eleven cards and their eleven stars, and
   * before the favourites load, the eleven cards alone. A count, so a returning control
   * under fresh wording fails here.
   */
  it("renders exactly the card and star buttons and nothing else", async () => {
    await renderSettled();
    expect(screen.getAllByRole("button")).toHaveLength(22);
  });

  it("renders no star anywhere while the favourites are pending", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomeScreen />);

    expect(screen.getAllByRole("button")).toHaveLength(11);
    expect(screen.queryByTestId(/^card-star-/)).toBeNull();
  });

  it("moves a card into Favourites on star without navigating", async () => {
    await renderSettled();
    // The server, honestly: once the add lands, the next read returns the row. Without
    // this the settle-time refetch would read `[]` and undo the flip it had just proven.
    mockAdd.mockImplementation(async () => {
      mockList.mockResolvedValue([{ kind: "tool", key: "mood" }]);
    });

    fireEvent.press(within(screen.getByTestId("home-tools")).getByTestId("card-star-tool-mood"));

    await waitFor(() => expect(cardsIn("home-favourites")).toEqual(["card-tool-mood"]));
    expect(screen.queryByText(EMPTY_LINE)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalledWith("user-1", "tool", "mood");
    // Still in its catalogue position too - twice, plainly.
    expect(cardsIn("home-tools")).toContain("card-tool-mood");
  });

  it("opens a tool from its card", async () => {
    await renderSettled();

    fireEvent.press(within(screen.getByTestId("home-tools")).getByTestId("card-tool-sleep"));
    expect(mockPush).toHaveBeenCalledWith("/tools/sleep");
  });

  // R3 (#1250): the Escape is present on every screen BELOW the root, and this is the
  // root, so it gets none by construction.
  it("renders no Escape - this is the root", async () => {
    await renderSettled();
    expect(screen.queryByTestId("screen-escape")).toBeNull();
  });

  /**
   * The `wide` flag drove header actions that no longer exist, so the breakpoint left
   * the screen with them (spec §1). Pinned at the source, because nothing rendered can
   * tell a screen that reads the window width from one that does not.
   */
  it("reads no window dimensions", () => {
    const source = readFileSync(join(__dirname, "today-screen.tsx"), "utf8");
    expect(source).not.toContain("useWindowDimensions");
  });
});
