import ToolsScreen, { TOOLS } from "@/src/features/tools/tools-screen";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { CHROME_MARK, CHROME_WASH } from "@/src/lib/theme/chrome";
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

jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessionCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntryCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/grounding/queries", () => ({
  useGroundingSessionCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabits: () => ({ data: [] }),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntryCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSessionCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: () => ({ data: [] }),
  useMoodLogCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogCount: () => ({ data: 0 }),
}));

/**
 * INVERTED by #587. This suite used to assert the opposite of what it asserts
 * now, and the history matters because it is what the inversion has to keep.
 *
 * The hub's tiles carried a hardcoded hue map of their own until #421, which had
 * drifted from tool-accent.ts on five of its six entries: journal, gratitude and
 * habits were all violet, grounding and sleep were all pink, so /tools rendered
 * six tools in two colours while the sidebar rendered the same six correctly.
 * Gratitude was the clearest case - gold in the nav, violet in the hub, in the
 * same screenshot. The fix was a single source of truth, and these tests pinned
 * every tile to it: "resolves every tile to a real entry", "renders each tile's
 * chip and glyph in that tool's own hue", "shows more than the two colours it
 * used to".
 *
 * #558 then ruled that a tool has no colour at all - eight tools in eight hues
 * is the "distinguishes items in a set" case, which an icon and a name already
 * do - so tool-accent.ts is deleted and every tile takes the same neutral pair.
 *
 * The defect the old suite guarded is therefore not merely gone, it is
 * unreachable: with no map there is nothing to drift from and no fallback to
 * fall into. What replaces it is the mirror-image risk, which is a partial
 * sweep - one tile left hued, or a later tile added with a hue - and the two
 * assertions below fail on exactly that. They also fail on the OLD behaviour,
 * which is the point of writing them this way round rather than deleting the
 * suite: `bg-muted` was on none of the eight tiles before this change, and
 * seven distinct chips is not one.
 */
describe("the tools hub paints no per-tool hue (#587)", () => {
  type Node = { props?: { className?: unknown }; type?: unknown };

  /** Every tile's host element, one per TOOLS entry. */
  function tiles() {
    const { UNSAFE_root } = renderWithProviders(<ToolsScreen />);
    // `typeof node.type === "string"` keeps only the host element: a Pressable
    // renders through several composite layers that all carry the same props,
    // so without it each tile matches three times over.
    const found = UNSAFE_root.findAll(
      (node) =>
        typeof node.type === "string" &&
        node.props?.accessibilityRole === "button" &&
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

  it("gives every tile the same neutral wash and mark", () => {
    // Scoped per TILE rather than to the screen, for the reason #421 found: a
    // whole-tree search cannot localise a defect when tools share a class.
    for (const tile of tiles()) {
      const classNames = classNamesIn(tile);

      expect(classNames).toContainEqual(expect.stringContaining(CHROME_WASH));
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
    // reason it must not start is unchanged too - 16px text owes 4.5:1.
    const { getByText } = renderWithProviders(<ToolsScreen />);
    // "Check-in" since #732 - this hub was the last en surface still calling the
    // tool "Mood tracker" while its own screens said Check-in.
    const name = getByText("Check-in");

    expect(name.props.className as string).not.toContain("text-be");
  });
});
