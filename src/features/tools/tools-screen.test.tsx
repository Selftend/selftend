import { screen } from "@testing-library/react-native";

import ToolsScreen from "@/src/features/tools/tools-screen";
import { TOOL_ITEMS } from "@/src/features/favorites/items";
import { favoriteKeys } from "@/src/features/favorites/queries";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { CHROME_ACCENT_MARK, CHROME_MARK, CHROME_WASH } from "@/src/lib/theme/chrome";
import { createTestQueryClient, renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // ScreenHeader renders the breadcrumb trail, which reads the route.
  usePathname: () => "/tools",
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/favorites/repository", () => ({
  addFavorite: jest.fn(),
  listFavorites: jest.fn().mockResolvedValue([]),
  removeFavorite: jest.fn(),
}));

// The card reads Home's stat rows (#1955); their strings are tested where they live.
// Here every tool is "still loading", which is the state a first paint sees.
jest.mock("@/src/features/home/tool-row-stats", () => ({
  ToolStat: ({ children }: { children: (stat: string | null) => React.ReactElement | null }) =>
    children(null),
}));

/** A favourites list already loaded, so the stars are drawn on the first render. */
function render() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(favoriteKeys.list("user-1"), [{ kind: "tool", key: "journal" }]);
  return renderWithProviders(<ToolsScreen />, { queryClient });
}

describe("the tools hub renders the catalogue's eight tools through the one card (#1955)", () => {
  it("renders every tool, in catalogue order, with a navigating region and a star each", () => {
    render();

    for (const item of TOOL_ITEMS) {
      expect(screen.getByTestId(`card-tool-${item.key}`)).toBeTruthy();
      expect(screen.getByTestId(`card-star-tool-${item.key}`)).toBeTruthy();
    }
    // Order is the array's, not the page's: the first card is the first item.
    const cards = screen.getAllByTestId(/^card-tool-/);
    expect(cards.map((card) => card.props.testID)).toEqual(
      TOOL_ITEMS.map((item) => `card-tool-${item.key}`),
    );
  });

  it("reflects the loaded favourites on the stars", () => {
    render();

    expect(screen.getByTestId("card-star-tool-journal").props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByTestId("card-star-tool-mood").props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it("draws no stat while the stats are loading - never a zero, never 'No logs yet'", () => {
    // `/tools`' old `statFor` rendered "No logs yet" to a user with 200 logs while their
    // count was still loading (`?? 0`). The card declines to claim anything instead.
    render();

    expect(screen.queryAllByTestId(/^card-stat-/)).toEqual([]);
    expect(screen.queryByText(/No .* yet/)).toBeNull();
  });
});

/**
 * INVERTED by #587 and kept through #1955. The hub's tiles once carried a hardcoded hue
 * map that had drifted from tool-accent.ts on five of six entries (#421); #558 then ruled
 * that a tool has no colour at all, so every tile takes one neutral pair. These two
 * assertions fail on a partial sweep - one tile left hued, or a later tile added with a
 * hue - and on the OLD behaviour, which is why they are written this way round rather
 * than deleted.
 */
describe("the tools hub paints no per-tool hue (#587)", () => {
  type Node = { props?: { className?: unknown }; type?: unknown };

  /** Every card's two host pressables - the navigating region and its star. */
  function tiles() {
    render();
    const found = [
      ...screen.getAllByTestId(/^card-tool-/),
      ...screen.getAllByTestId(/^card-star-tool-/),
    ];
    expect(found).toHaveLength(TOOL_ITEMS.length * 2);
    return found;
  }

  /** Every className string rendered inside one tile. */
  const classNamesIn = (tile: { findAll: (predicate: (node: Node) => boolean) => Node[] }) =>
    tile
      .findAll((node) => typeof node.props?.className === "string")
      .map((node) => node.props?.className as string);

  it("gives every tile the same neutral wash and mark", () => {
    // Scoped per TILE rather than to the screen, for the reason #421 found: a
    // whole-tree search cannot localise a defect when tools share a class.
    for (const tile of tiles()) {
      const classNames = classNamesIn(tile);
      // The wash sits behind the mark, which is in the navigating region; the star
      // column has none and carries only an ink - the mark role when hollow, the accent
      // role when filled (journal is starred in this fixture). Both are chrome roles.
      if ((tile.props.testID as string).startsWith("card-tool-")) {
        expect(classNames).toContainEqual(expect.stringContaining(CHROME_WASH));
      }
      expect(
        classNames.some((name) => {
          const classes = name.split(/\s+/);
          return classes.includes(CHROME_MARK) || classes.includes(CHROME_ACCENT_MARK);
        }),
      ).toBe(true);
    }
  });

  it("carries no module hue anywhere in the tile", () => {
    // The partial-sweep assertion. One tile still on `bg-clay/10` reads as a
    // deliberate accent rather than a miss, so nothing but a scan catches it.
    // String.raw, not a plain template: in a plain one `\w` collapses to `w`,
    // so the boundary guards would compile as `(?<![w-])` and match `text-actor`
    // as readily as `text-act`.
    const hue = new RegExp(
      String.raw`(?<![\w-])(text|bg|border)-(${HUE_NAMES.join("|")})(-ink)?(?![\w-])`,
    );

    for (const tile of tiles()) {
      expect(classNamesIn(tile).filter((name) => hue.test(name))).toEqual([]);
    }
  });

  it("leaves the tile names on the neutral foreground", () => {
    // Unchanged by the inversion: the hub never hued its tile names, and the
    // reason it must not start is unchanged too - 16px text owes 4.5:1.
    render();
    // "Check-in" since #732 - this hub was the last en surface still calling the
    // tool "Mood tracker" while its own screens said Check-in.
    const name = screen.getByText("Check-in");

    expect(name.props.className as string).not.toContain("text-be");
  });
});
