import { screen } from "@testing-library/react-native";

import { InfoScreen } from "@/src/features/policies/info-screen";
import i18n from "@/src/i18n";
import { appEnv, projectContactEmails } from "@/src/lib/env";
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

  /**
   * The FAQ's contact addresses come from `EXPO_PUBLIC_*` rather than from the
   * copy (#2131), and this is the only place the two halves are checked together:
   * `test/policy-contact-addresses.test.ts` reads the JSON, `src/lib/env.test.ts`
   * reads the resolver, and neither notices if `InfoScreen` stops passing the
   * values through.
   *
   * ☠️ It fails SILENTLY when that happens. i18next's "missed to pass in variable"
   * message is routed through its debug logger, and `src/i18n/index.ts` does not
   * set `debug`, so an unsupplied variable prints nothing - `test/setup.js`, which
   * throws on unexpected console output, has nothing to throw on. The reader just
   * gets `write to {{supportEmail}}` on a policy page.
   */
  describe("contact addresses in the FAQ", () => {
    const configured = {
      privacyEmail: "privacy@fork.example",
      securityEmail: "security@fork.example",
      supportEmail: "support@fork.example",
    };
    const original = { ...appEnv };

    afterEach(() => {
      appEnv.privacyEmail = original.privacyEmail;
      appEnv.securityEmail = original.securityEmail;
      appEnv.supportEmail = original.supportEmail;
    });

    function renderFaq() {
      renderWithProviders(
        <InfoScreen sectionKey="faq.sections" subtitle="Common questions." title="FAQ" />,
      );
    }

    it("renders the addresses this build was configured with", () => {
      appEnv.privacyEmail = configured.privacyEmail;
      appEnv.securityEmail = configured.securityEmail;
      appEnv.supportEmail = configured.supportEmail;

      renderFaq();

      // Exact counts, because "at least one" would pass with the parents letter
      // still hardcoded: support and privacy are named twice - once in the
      // parents letter, once in the contact answer - and security once.
      expect(screen.getAllByText(new RegExp(configured.supportEmail))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(configured.privacyEmail))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(configured.securityEmail))).toHaveLength(1);
    });

    /**
     * The defect this fix exists for. A fork that set its own addresses used to
     * get them on `/support` and OURS here, in the paragraph telling a stranger
     * where to send a data-deletion request.
     */
    it("does not leak this project's addresses into a configured fork's FAQ", () => {
      appEnv.privacyEmail = configured.privacyEmail;
      appEnv.securityEmail = configured.securityEmail;
      appEnv.supportEmail = configured.supportEmail;

      renderFaq();

      Object.values(projectContactEmails).forEach((address) => {
        expect(screen.queryByText(new RegExp(address))).toBeNull();
      });
    });

    it("falls back to this project's addresses when the build set none", () => {
      appEnv.privacyEmail = "";
      appEnv.securityEmail = "";
      appEnv.supportEmail = "";

      renderFaq();

      expect(screen.getAllByText(new RegExp(projectContactEmails.support))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(projectContactEmails.security))).toHaveLength(1);
    });

    it("leaves no unresolved interpolation on the page", () => {
      appEnv.privacyEmail = "";
      appEnv.securityEmail = "";
      appEnv.supportEmail = "";

      renderFaq();

      expect(screen.queryAllByText(/\{\{/)).toEqual([]);
    });
  });
});
