import { toolAccent } from "@/src/features/home/tool-accent";
import ToolsScreen, { TOOLS } from "@/src/features/tools/tools-screen";
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

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLogs: () => ({ data: [] }),
  useMoodLogCount: () => ({ data: 0 }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogCount: () => ({ data: 0 }),
}));

/**
 * The hub's tiles took their hues from a hardcoded map of their own until #421,
 * which had drifted from src/features/home/tool-accent.ts on five of its six
 * entries: journal, gratitude and habits were all violet and grounding and
 * sleep were all pink, so /tools rendered six tools in two colours while the
 * sidebar rendered the same six correctly. Gratitude was the clearest case -
 * gold in the nav, violet in the hub, in the same screenshot.
 *
 * These tests are about where the hues come from, not what they are. The values
 * belong to tool-accent.ts and are contrast-gated in
 * test/accent-ink-call-sites.test.ts; asserting them literally here would just
 * reproduce the duplication the fix removed.
 */
describe("the tools hub takes its hues from tool-accent.ts", () => {
  /** What `toolAccent` hands back for an id it does not know: violet. */
  const FALLBACK = toolAccent("no-such-tool");

  it("resolves every tile to a real entry rather than the violet fallback", () => {
    // A tile key that is not an id in the map is the silent failure mode: it
    // still renders, in `primary`, and looks deliberate. This is the assertion
    // that would have caught a rename.
    const fellBack = TOOLS.filter((tool) => toolAccent(tool.key).chip === FALLBACK.chip).map(
      (tool) => tool.key,
    );

    expect(fellBack).toEqual([]);
  });

  it("renders each tile's chip and glyph in that tool's own hue", () => {
    const { UNSAFE_root } = renderWithProviders(<ToolsScreen />);

    const classNames = UNSAFE_root.findAll((node) => typeof node.props?.className === "string").map(
      (node) => node.props.className as string,
    );

    for (const tool of TOOLS) {
      const accent = toolAccent(tool.key);
      expect(classNames).toContainEqual(expect.stringContaining(accent.chip));
      expect(classNames.some((name) => name.split(/\s+/).includes(accent.icon))).toBe(true);
    }
  });

  it("shows more than the two colours it used to", () => {
    // The defect stated as the user saw it. Journal and sleep legitimately
    // share `ink`, so six tools are five hues - the point is that it is not two.
    const hues = new Set(TOOLS.map((tool) => toolAccent(tool.key).chip));

    expect(hues.size).toBe(5);
  });

  it("leaves the tile names on the neutral foreground", () => {
    // The hub paints no hue text: `accent.ink` exists for the sidebar's active
    // row, where the tint carries state. If a name ever does take a hue, it is
    // 16px text and owes 4.5:1 on the tile, which the raw accent does not meet.
    const { getByText } = renderWithProviders(<ToolsScreen />);
    const name = getByText("Mood tracker");

    expect(name.props.className as string).not.toContain("text-be");
  });
});
