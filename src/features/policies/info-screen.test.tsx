import { screen } from "@testing-library/react-native";

import { InfoScreen } from "@/src/features/policies/info-screen";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/crisis";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

/**
 * ☠️ SIX of the seven policy routes render through this component: `/crisis`,
 * `/privacy`, `/terms`, `/cookies`, `/account-deletion` and `/faq`. **`/security`
 * is NOT among them** - it hand-rolls the same card structure inline and takes
 * its Escape from `ScreenHeader` directly, so nothing here has ever said
 * anything about it.
 *
 * This claim used to name `/security` too, and the false coverage it implied is
 * part of why that page shipped an h1 → h3 outline unnoticed (#2133). Its
 * heading outline now has a real guard in `policy-heading-outline.test.tsx`,
 * which renders `/security` and `/privacy` and asserts they agree.
 *
 * ⚠️ The Escape assertion that used to live here **moved to
 * `policy-page-layout.test.tsx`** on #2144. It was never `InfoScreen`'s: the
 * header renders `<ScreenEscape />` unconditionally, so it was a `ScreenHeader`
 * test in disguise, and it now sits with the layout that `/security` and `/faq`
 * fold onto.
 */
describe("InfoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/crisis";
  });

  /**
   * The card-per-section shape and its heading level, asserted for the first
   * time (#2144). **Nothing pinned this before**, on either copy of the
   * structure, which is precisely how `/security`'s inline duplicate drifted to
   * level 3 without a single test noticing (#2133).
   *
   * ☠️ Levels are read through `Number(...)`. `text.tsx`'s `ARIA_LEVEL` map
   * yields **strings** (`"1"` for the `h1` title) while `CardTitle` passes a
   * **number** (`2`), so a bare `toBe(1)` fails on the title for the wrong
   * reason and a bare `toBe("2")` fails on the sections. Same precedent as
   * `policy-heading-outline.test.tsx` and the two module-home tests.
   */
  it("renders one level-2 card per section, under a single h1", () => {
    renderWithProviders(
      <InfoScreen
        sectionKey="crisis.sections"
        subtitle="If you need help now."
        title="Crisis support"
      />,
    );

    const levels = screen.getAllByRole("heading").map((node) => Number(node.props["aria-level"]));

    // Anti-vacuity: `every` over an empty array passes, so a query that matched
    // nothing would make the rest meaningless. `crisis.sections` holds three
    // sections, so the title plus those three is the floor.
    expect(levels.length).toBeGreaterThanOrEqual(4);
    expect(levels[0]).toBe(1);
    expect(levels.slice(1)).toEqual(levels.slice(1).map(() => 2));
  });

  /**
   * The paragraphs of a section render as separate descriptions under that
   * section's title, rather than being joined. Pinned because
   * `PolicySectionCards` is now shared: a caller that flattened `body` would
   * still satisfy the heading assertion above.
   */
  it("renders every paragraph of a section", () => {
    renderWithProviders(
      <InfoScreen
        sectionKey="crisis.sections"
        subtitle="If you need help now."
        title="Crisis support"
      />,
    );

    const sections = i18n.t("policies:crisis.sections", { returnObjects: true }) as {
      title: string;
      body: string[];
    }[];

    expect(sections.length).toBeGreaterThanOrEqual(3);
    for (const section of sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      for (const paragraph of section.body) {
        expect(screen.getByText(paragraph)).toBeTruthy();
      }
    }
  });

  /**
   * `showLastUpdated` still renders the date inside the SAME muted `Text` as the
   * subtitle. #2144 moved that `Text` into `PolicyPageLayout` behind a
   * `ReactNode` prop; had the prop been typed `string`, the caller would have
   * had to concatenate and the node tree would have changed under a refactor
   * whose whole gate is that nothing on screen moves.
   */
  it("keeps the last-updated date in the same text run as the subtitle", () => {
    renderWithProviders(
      <InfoScreen
        sectionKey="crisis.sections"
        showLastUpdated
        subtitle="If you need help now."
        title="Crisis support"
      />,
    );

    // ONE node carries both halves. If the caller had concatenated them, or if
    // the layout had rendered the suffix as its own `Text`, these two queries
    // would return different nodes - which is the drift this pins.
    expect(screen.getByText(/If you need help now\./)).toBe(screen.getByText(/Last updated/));
  });
});
