import { screen } from "@testing-library/react-native";

import MeditationScreen from "../../../app/meditation";
import MeditationLearnScreen from "./meditation-learn-screen";
import enMeditation from "@/src/i18n/locales/en/meditation.json";
import { STRUCTURED_DATA_TYPE } from "@/src/lib/structured-data";
import { h1Text } from "@/test/h1";
import { meta, reset, tags } from "@/test/head-capture";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

let mockPathname = "/meditation";
jest.mock("expo-router", () => ({
  // The site footer that `PolicyPageLayout` closes every public page with is
  // made of LinkButtons (#2467).
  Link: require("@/test/expo-router-link-mock").MockLink,
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

const {
  attentionTitle,
  gardenerTitle,
  nonLinearTitle,
  subtitle,
  title: learnTitle,
} = enMeditation.module.learn;

/** Every heading's text, in tree order, whatever its level. */
const headingTexts = () =>
  screen.getAllByRole("heading").map((node) => String(node.props.children));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  reset();
  mockPathname = "/meditation";
  jest.clearAllMocks();
  // ☠️ `RouteHead` returns `null` off web, so every head assertion below reads
  // an EMPTY capture on the default `ios` platform - passing for `toEqual([])`
  // and failing for the rest, which is the worst of both. Same reason
  // `policy-page-layout.head.test.tsx` sets it.
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

/**
 * `/meditation` - the first public explainer page (#2469, docs/brand-result.md
 * § 3-5).
 *
 * What is under test is not "a page renders": it is the four claims the spec
 * makes about this page that nothing else in the suite would catch.
 *
 * 1. **A stranger can read the framework.** The screen is rendered with no
 *    session, no query client priming and no auth mock, because the page reads
 *    no session - the thing that makes it exportable as finished HTML rather
 *    than a spinner. If a future edit reaches for `useAuth` or a query here,
 *    this file is where it fails.
 * 2. **The title is the module's name, not the learn screen's instruction.**
 *    Both halves are asserted, because the wrong one is a string that already
 *    exists and would render perfectly happily (§ 3.2's one named exception).
 * 3. **The head is complete and points at this page.** Title through the
 *    template, description = the on-page subline verbatim, `og:url` and
 *    canonical on the one serving origin.
 * 4. **No structured data.** § 5 keeps `Organization` and `WebSite` on `/` and
 *    nothing anywhere else, and "nothing anywhere else" is only true while
 *    something checks.
 *
 * The heading LEVELS are pinned in `policy-heading-outline.test.tsx` instead,
 * beside `/security` and `/privacy` - the defect they guard against (h1 → h3) is
 * a property of the shared layout and the card, not of this route.
 */
describe("/meditation - the public explainer page", () => {
  it("renders the three framework pieces with no session", () => {
    renderWithProviders(<MeditationScreen />);

    expect(screen.getByRole("heading", { name: attentionTitle })).toBeTruthy();
    expect(screen.getByRole("heading", { name: gardenerTitle })).toBeTruthy();
    expect(screen.getByRole("heading", { name: nonLinearTitle })).toBeTruthy();
    expect(screen.getByText(enMeditation.module.learn.attentionBody)).toBeTruthy();
  });

  it("titles the page with the module's name, never the learn screen's instruction", () => {
    renderWithProviders(<MeditationScreen />);

    expect(h1Text()).toBe(enMeditation.module.home.title);
    expect(headingTexts()).not.toContain(learnTitle);
  });

  it("carries the existing subline as its on-page description", () => {
    renderWithProviders(<MeditationScreen />);

    expect(screen.getByText(subtitle)).toBeTruthy();
  });

  /**
   * ☠️ The body is ONE component with two renderers, and a duplicated copy
   * would pass every assertion above. This is the assertion that fails on a
   * fork: the gated learn screen and the public page render the same three
   * headings, in the same order, out of the same file.
   */
  it("renders the same three cards the gated learn screen does", () => {
    renderWithProviders(<MeditationScreen />);
    const publicHeadings = headingTexts().filter((text) => text !== enMeditation.module.home.title);

    screen.unmount();
    renderWithProviders(<MeditationLearnScreen />);
    const gatedHeadings = headingTexts().filter((text) => text !== learnTitle);

    expect(publicHeadings).toEqual([attentionTitle, gardenerTitle, nonLinearTitle]);
    expect(gatedHeadings).toEqual(publicHeadings);
  });

  it("composes the document title through the template and the description from the subline", () => {
    renderWithProviders(<MeditationScreen />);

    const documentTitle = tags().find(({ type }) => type === "title")?.props.children as string;

    expect(documentTitle).toBe(`${enMeditation.module.home.title} - Selftend`);
    expect(meta("description").map(({ props }) => props.content)).toEqual([subtitle]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([documentTitle]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([subtitle]);
  });

  it("points og:url and the canonical at https://selftend.org/meditation", () => {
    renderWithProviders(<MeditationScreen />);

    expect(meta("og:url").map(({ props }) => props.content)).toEqual([
      "https://selftend.org/meditation",
    ]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/meditation"]);
  });

  it("emits no structured-data block", () => {
    renderWithProviders(<MeditationScreen />);

    // Anti-vacuity: the head is populated, so the absence below is an absence
    // of ld+json rather than an absence of any captured tag at all.
    expect(tags().length).toBeGreaterThanOrEqual(6);
    expect(tags().filter(({ props }) => props.type === STRUCTURED_DATA_TYPE)).toEqual([]);
  });
});
