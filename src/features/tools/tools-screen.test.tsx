import { screen } from "@testing-library/react-native";

import ToolsScreen from "@/src/features/tools/tools-screen";
import { TOOLS } from "@/src/features/favorites/items";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // ScreenHeader renders the breadcrumb trail, which reads the route.
  usePathname: () => "/tools",
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/favorites/queries", () => ({
  useFavorites: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/src/features/home/tool-row-stats", () => ({
  ToolStat: () => null,
}));

/**
 * INVERTED by #587, and carried onto the one card by #1955. This suite used to assert
 * the opposite of what it asserts now, and the history matters because it is what the
 * inversion has to keep.
 *
 * The hub's tiles carried a hardcoded hue map of their own until #421, which had
 * drifted from tool-accent.ts on five of its six entries - /tools rendered six tools in
 * two colours while the sidebar rendered the same six correctly. #558 then ruled that a
 * tool has no colour at all: eight tools in eight hues is the "distinguishes items in a
 * set" case, which an icon and a name already do.
 *
 * What replaces the old guard is the mirror-image risk - a partial sweep, one tile left
 * hued or a later tile added with a hue - and the two assertions below fail on exactly
 * that. They also fail on the OLD behaviour, which is the point of keeping the suite.
 */
describe("the tools hub paints no per-tool hue (#587)", () => {
  type Node = { props?: { className?: unknown }; type?: unknown };

  /** Every card's host element, one per TOOLS entry. */
  function tiles() {
    const { UNSAFE_root } = renderWithProviders(<ToolsScreen />);
    // `typeof node.type === "string"` keeps only the host element. The card is an inert
    // View since #1887 - the two pressables are its children - so the outer box is what
    // carries the wrapping-row sizing class.
    const found = UNSAFE_root.findAll(
      (node) =>
        typeof node.type === "string" &&
        typeof node.props?.className === "string" &&
        node.props.className.includes("basis-[260px]"),
    );
    expect(found).toHaveLength(TOOLS.length);
    return found;
  }

  /** Every className string rendered inside one tile. */
  const classNamesIn = (tile: { findAll: (predicate: (node: Node) => boolean) => Node[] }) =>
    tile
      .findAll((node) => typeof node.props?.className === "string")
      .map((node) => node.props?.className as string);

  it("gives every tile the same neutral mark", () => {
    // Scoped per TILE rather than to the screen, for the reason #421 found: a
    // whole-tree search cannot localise a defect when tools share a class.
    for (const tile of tiles()) {
      const classNames = classNamesIn(tile);
      expect(classNames.some((name) => name.split(/\s+/).includes(CHROME_MARK))).toBe(true);
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
    // reason it must not start is unchanged too - 15px text owes 4.5:1.
    const { getByText } = renderWithProviders(<ToolsScreen />);
    // "Check-in" since #732 - this hub was the last en surface still calling the
    // tool "Mood tracker" while its own screens said Check-in.
    const name = getByText("Check-in");

    expect(name.props.className as string).not.toContain("text-be");
  });
});

describe("the tools hub renders the catalogue's first eight through the one card (#1955)", () => {
  it("renders exactly the eight tool cards, each with a star", () => {
    renderWithProviders(<ToolsScreen />);

    expect(screen.getAllByTestId(/^card-tool-/).map((node) => node.props.testID)).toEqual(
      TOOLS.map((tool) => `card-tool-${tool.key}`),
    );
    expect(screen.getAllByTestId(/^card-star-tool-/)).toHaveLength(TOOLS.length);
    expect(screen.queryByTestId(/^card-module-/)).toBeNull();
  });
});
