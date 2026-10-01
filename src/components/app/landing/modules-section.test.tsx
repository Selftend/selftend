import { screen } from "@testing-library/react-native";

import { ModulesSection } from "./modules-section";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { shouldShowModules } from "@/src/lib/module-visibility";
import { renderWithProviders } from "@/test/render-with-providers";

// The one list that decides what is public (docs/indexability.md § 3), read
// from the export script's module rather than restated - the assertion below
// is only a pin if it cannot drift from the thing it pins (the site-footer
// pin's reasoning, § 7.6).
const { INDEX_LIST } = require("@/scripts/lib/index-list") as { INDEX_LIST: readonly string[] };

describe("ModulesSection", () => {
  it("renders the CBT module card", () => {
    renderWithProviders(<ModulesSection />);

    expect(screen.getByText("CBT module")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Examine unhelpful thoughts" })).toBeTruthy();
  });

  it("renders the ACT module card", () => {
    renderWithProviders(<ModulesSection />);

    expect(screen.getByText("ACT module")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Act on your values" })).toBeTruthy();
  });

  it("renders the DBT module card", () => {
    renderWithProviders(<ModulesSection />);

    expect(screen.getByText("DBT module")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Get through intense moments" })).toBeTruthy();
  });

  /**
   * ☠️ **A live module ships its explainer, and its card links to it - enforced
   * here, not remembered** (#2881, decided on #2863; this test replaces the
   * standing reminder [#2473](https://github.com/Selftend/selftend/issues/2473),
   * whose `blocked_by` edge rotted twice because the gate is an event and no
   * issue represents an event).
   *
   * The spec is `docs/brand-result.md`: § 3.2 decides each explainer's route
   * and title, § 3.3 binds the page to the PR that makes its module reachable
   * on production, § 7.5 says each landing card links to its module's
   * explainer with the card's existing title as anchor, and § 7.6 sites the
   * card-link assertion in this file. #2473's table, kept here so the
   * return-PR author lands on it without reading further:
   *
   * | Module | Route  | Explainer title (existing app string)                  |
   * | ------ | ------ | ------------------------------------------------------ |
   * | CBT    | `/cbt` | Thinking patterns (`cbt:learn.title`)                  |
   * | DBT    | `/dbt` | What DBT is (`dbt:learn.title`)                        |
   * | ACT    | `/act` | Acceptance & Commitment Therapy (`act:home.fullTitle`) |
   *
   * **"Live" is the shipped meaning, not #2448's unbuilt per-module list:**
   * can a person on an iOS production build reach a module
   * (`shouldShowModules` - the same question `test/index-list.test.ts`
   * § _the module explainers ↔ the module gate_ asks, whose positive control
   * also proves the predicate still discriminates). The predicate takes no
   * module key, so the three modules go live together or not at all
   * (`docs/modules/tools.md` § _Lifting it_ records that tension with #2446's
   * per-module bar; whoever opens the gate decides which gives way).
   *
   * ⚠️ **Current reality, encoded over #2473's stale sentence:** #2473
   * (2026-09-22) said no DBT card exists before DBT's return, but #2808/#2823
   * (2026-09-29) shipped one, and the section is deliberately not gated - all
   * three cards render today, unlinked (§ 7.5's own ⚠️ records the card; its
   * "cards are absent while gated" clause is the part reality overtook). So
   * the card→explainer link is demanded exactly when the modules are live:
   *
   * - **Gated (today):** the card's title is a heading and NOT a link, and
   *   the explainer is off the index list. A card linking to an unlisted
   *   route would be a dead link on production, and a listed-early page
   *   would make the sitemap lie (`test/index-list.test.ts` holds that
   *   equality in both directions).
   * - **Live (the return PR):** the explainer is on the index list AND the
   *   card links to it, anchor = the card's existing title (§ 7.3 via
   *   § 7.5). Opening the gate without building the page and the link turns
   *   these per-card assertions red - which is the entire point.
   */
  describe("the module cards ↔ their explainers (§ 7.5, #2881)", () => {
    /**
     * Route per § 3.2 (the app's own slug); anchor per § 7.5 (the card's
     * existing landing title, read from the locale file so "the card's
     * existing title" cannot drift from what this table demands).
     */
    const CARD_EXPLAINERS = [
      { module: "CBT", route: "/cbt", anchor: enAuth.landingPage.cbtTitle },
      { module: "DBT", route: "/dbt", anchor: enAuth.landingPage.dbtTitle },
      { module: "ACT", route: "/act", anchor: enAuth.landingPage.actTitle },
    ];

    const modulesLive = shouldShowModules("production", false, "ios");

    /**
     * The live-side bill, in one place so the control below can prove it
     * fires: the explainer is indexable, and the card is a link named by its
     * own title whose target is that explainer. (`props.href` is how every
     * rendered link in this suite carries its target - the site-footer pin
     * reads the same prop.)
     */
    function expectCardLinksToExplainer(route: string, anchor: string) {
      expect(INDEX_LIST).toContain(route);
      expect(screen.getByRole("link", { name: anchor }).props.href).toBe(route);
    }

    it.each(CARD_EXPLAINERS)(
      "$module: the card carries its explainer link exactly when the modules are live",
      ({ route, anchor }) => {
        renderWithProviders(<ModulesSection />);

        if (modulesLive) {
          expectCardLinksToExplainer(route, anchor);
        } else {
          expect(INDEX_LIST).not.toContain(route);
          expect(screen.queryByRole("link", { name: anchor })).toBeNull();
        }
      },
    );

    it("the live-side bill is proved to bite, so the gated branch is never quietly vacuous", () => {
      renderWithProviders(<ModulesSection />);

      if (modulesLive) {
        // Live: the bill runs for real in the per-card assertions above, so
        // there is nothing vacuous left to prove - this re-runs it once.
        expectCardLinksToExplainer("/cbt", enAuth.landingPage.cbtTitle);
      } else {
        // Gated: the per-card test exercises only its else-branch, so prove
        // the OTHER branch is a real demand by running each of its clauses
        // against today's section - the unlisted route and the unlinked card
        // must BOTH fail it, independently. A return PR that opens the gate
        // without the page or the link meets these same expectations, red.
        expect(() => expect(INDEX_LIST).toContain("/cbt")).toThrow();
        expect(() => screen.getByRole("link", { name: enAuth.landingPage.cbtTitle })).toThrow();
      }
    });
  });
});
