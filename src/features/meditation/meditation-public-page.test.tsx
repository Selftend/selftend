import { screen } from "@testing-library/react-native";
import { ActivityIndicator } from "react-native";

import MeditationScreen from "../../../app/meditation";
import enCommon from "@/src/i18n/locales/en/common.json";
import enMeditation from "@/src/i18n/locales/en/meditation.json";
import { meta, reset, tags } from "@/test/head-capture";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

jest.mock("expo-router", () => ({
  // The site footer `PolicyPageLayout` renders is made of LinkButtons (#2467).
  Link: require("@/test/expo-router-link-mock").MockLink,
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/meditation",
}));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  reset();
  jest.clearAllMocks();
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

/**
 * `/meditation` - the first public explainer page (#2469, docs/brand-result.md
 * § 3-5).
 *
 * What this file is FOR: the page is a composition, not new behaviour. Its body
 * is pinned by `meditation-learn-screen.test.tsx` (the same component, unedited
 * there), its head mechanism by `route-head.test.tsx`, its footer by
 * `site-footer.test.tsx` and its membership by the three index-list pins. What
 * none of those can see is whether THIS route put the pieces together - which
 * title it chose, that the content actually reaches a reader with no account,
 * and that it stayed bare where the spec says bare.
 *
 * ☠️ The title assertion is the one most worth having. `module.learn.title`
 * ("Learn the framework") is the string every other public page's rule would
 * have produced, it renders perfectly well, and it is wrong in two places at
 * once - the `<title>` a stranger reads in a search result, and the footer label
 * on every public page. Nothing else in the suite would notice the swap.
 */
describe("the public /meditation explainer", () => {
  it("renders the three framework pieces with no account", () => {
    renderWithProviders(<MeditationScreen />);

    expect(
      screen.getByRole("heading", { name: enMeditation.module.learn.attentionTitle }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: enMeditation.module.learn.gardenerTitle }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: enMeditation.module.learn.nonLinearTitle }),
    ).toBeTruthy();
    expect(screen.getByText(enMeditation.module.learn.attentionBody)).toBeTruthy();
  });

  /**
   * The spec's one named exception to "the title is whatever the app already
   * calls it" (§ 3.2, Appendix A.18): where a learn screen's title is an
   * INSTRUCTION rather than a name, the page takes the module's name. Both are
   * existing app strings, so the exception costs no new copy - and the negative
   * half is the assertion that matters, because the instruction is what the
   * general rule would have selected.
   */
  it("is titled with the module's name, never the learn screen's instruction", () => {
    renderWithProviders(<MeditationScreen />);

    expect(screen.getByRole("heading", { name: enMeditation.module.home.title })).toBeTruthy();
    expect(screen.queryByText(enMeditation.module.learn.title)).toBeNull();
  });

  /**
   * ☠️ Anti-vacuity for the negative above: it is only meaningful while the two
   * strings actually differ. If "Learn the framework" were ever reworded to
   * "Meditation", the `queryByText` would pass on a page that had made exactly
   * the mistake this file exists to catch.
   */
  it("has two distinct candidate titles, so the assertion above is not vacuous", () => {
    expect(enMeditation.module.home.title).not.toBe(enMeditation.module.learn.title);
  });

  /**
   * § 5's row, end to end: `<title>` through the one template key, the existing
   * subline verbatim as both descriptions, and the apex URL twice.
   */
  it("owns its head - title, description, og:* and canonical at the apex path", () => {
    renderWithProviders(<MeditationScreen />);

    const documentTitle = `${enMeditation.module.home.title} - Selftend`;
    // The template is the source of the shape; restating it here would pin the
    // test to itself rather than to `common:documentTitle`.
    expect(enCommon.documentTitle).toBe("{{page}} - Selftend");

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: documentTitle } },
    ]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([documentTitle]);
    expect(meta("description").map(({ props }) => props.content)).toEqual([
      enMeditation.module.learn.subtitle,
    ]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([
      enMeditation.module.learn.subtitle,
    ]);
    expect(meta("og:url").map(({ props }) => props.content)).toEqual([
      "https://selftend.org/meditation",
    ]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/meditation"]);
  });

  /**
   * § 6: the landing keeps the only structured-data block, and an explainer page
   * carries none. Read off the head rather than grepped from source, so it fails
   * on a block arriving through any component this page renders.
   */
  it("carries no structured-data block", () => {
    renderWithProviders(<MeditationScreen />);

    expect(tags().filter(({ type }) => type === "script")).toEqual([]);
    // Anti-vacuity: the head rendered at all, so the emptiness above is a fact
    // about this page rather than about a mock that captured nothing.
    expect(tags().length).toBeGreaterThan(0);
  });

  /**
   * The chrome comes from `PolicyPageLayout`, proven by what only the layout
   * provides: the unconditional Escape from `ScreenHeader`, and the one
   * `SiteFooter` that carries crisis guidance onto every public page.
   *
   * ⚠️ Like `/faq` and `/security`, this route deliberately has no
   * `STATIC_ROUTES` row, so the one-crumb trail hides itself and the Escape is
   * the bare Up affordance.
   */
  it("renders through PolicyPageLayout, so it carries the Escape and the site footer", () => {
    renderWithProviders(<MeditationScreen />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getByRole("link", { name: enCommon.safety.openCrisis }).props.href).toBe(
      "/crisis",
    );
  });

  /**
   * The page reads no session and no server state, so there is nothing on it
   * that can arrive later and nothing that can be a spinner - ADR-0009 has no
   * object here. Read on the FIRST render, with no `await` and no act flush: a
   * surface that resolved from a query would still be pending at this point, so
   * the final copy being present is the evidence that none of it is fetched.
   *
   * ⚠️ Deliberately not `queryByTestId("reserved-space")`: `ReservedSpace`'s
   * `testID` is an optional prop its callers pass, so that query matches nothing
   * whether or not the component is on the page - a vacuous assertion.
   */
  it("is complete on first render, so nothing on it can be a loading state", () => {
    renderWithProviders(<MeditationScreen />);

    expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toEqual([]);
    expect(screen.getByText(enMeditation.module.learn.nonLinearBody)).toBeTruthy();
    expect(screen.getByText(enMeditation.module.learn.gardenerBody)).toBeTruthy();
  });
});
