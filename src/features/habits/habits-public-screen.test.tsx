import { screen } from "@testing-library/react-native";

import HabitsScreen from "../../../app/habits";
import { HabitsLearnCardsBody } from "./habits-learn-cards-body";
import { HabitsLearnIndexScreen } from "./habits-learn-screen";
import enHabits from "@/src/i18n/locales/en/habits.json";
import { HABITS_LEARN_CARDS } from "@/src/features/habits/learn";
import { STRUCTURED_DATA_TYPE } from "@/src/lib/structured-data";
import { h1Text } from "@/test/h1";
import { meta, reset, tags } from "@/test/head-capture";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

let mockPathname = "/habits";
jest.mock("expo-router", () => ({
  // The site footer that `PolicyPageLayout` closes every public page with is
  // made of LinkButtons (#2467).
  Link: require("@/test/expo-router-link-mock").MockLink,
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

const { indexSubtitle, indexTitle } = enHabits.learn;
const cards = enHabits.learn.cards;

/** Every heading's text, in tree order, whatever its level. */
const headingTexts = () =>
  screen.getAllByRole("heading").map((node) => String(node.props.children));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  reset();
  mockPathname = "/habits";
  jest.clearAllMocks();
  // ☠️ `RouteHead` returns `null` off web, so every head assertion below reads
  // an EMPTY capture on the default `ios` platform - passing for `toEqual([])`
  // and failing for the rest, which is the worst of both.
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

/**
 * `/habits` - the second public explainer page (#2470, docs/brand-result.md
 * § 3-5).
 *
 * What is under test is not "a page renders": it is the claims the spec makes
 * about this page that nothing else in the suite would catch.
 *
 * 1. **A stranger can read the ideas.** The screen is rendered with no session,
 *    no query client priming and no auth mock, because the page reads no
 *    session - the thing that makes it exportable as finished HTML rather than
 *    a spinner. If a future edit reaches for `useAuth` or a query here, this
 *    file is where it fails.
 * 2. **All ten bodies are on the page, and none of its cards is a link.** This
 *    is the one place `/habits` departs from `/meditation`'s shape, and the
 *    departure is the whole point: the gated surface is an index into ten
 *    article routes that a reader with no account cannot open, so the public
 *    page carries the articles instead (§ 3.2 - "ten cards, each with a title,
 *    a short line and a body"). Both halves are asserted, because a body that
 *    silently fell back to the link rows would still render ten titles.
 * 3. **The head is complete and points at this page**, including the composed
 *    title's two hyphens - accepted, and pinned so that "fixing" it is a
 *    deliberate act (§ 5).
 * 4. **No structured data.** § 5 keeps `Organization` and `WebSite` on `/` and
 *    nothing anywhere else, and "nothing anywhere else" is only true while
 *    something checks.
 *
 * The heading LEVELS are pinned in `policy-heading-outline.test.tsx` instead,
 * beside `/security` and `/privacy` - the defect they guard against (h1 → h3) is
 * a property of the shared layout and the card, not of this route.
 */
describe("/habits - the public explainer page", () => {
  it("renders all ten cards' titles and bodies with no session", () => {
    renderWithProviders(<HabitsScreen />);

    for (const { slug } of HABITS_LEARN_CARDS) {
      const card = cards[slug as keyof typeof cards];
      expect(screen.getByRole("heading", { name: card.title })).toBeTruthy();
      expect(screen.getByText(card.short)).toBeTruthy();
      expect(screen.getByText(card.body)).toBeTruthy();
    }
  });

  /**
   * ☠️ The gated index's rows push to `/tools/habits/learn/[slug]` - behind the
   * gate and off the index list, so on this page they would be ten rows that
   * dead-end at a sign-in wall and ten crawlable links to a 404. That is why
   * `presentation` is a required prop rather than a default, and this is the
   * assertion that fails if someone later gives it one.
   */
  it("renders no card as a link into the gated article routes", () => {
    renderWithProviders(<HabitsScreen />);

    for (const { slug } of HABITS_LEARN_CARDS) {
      expect(screen.queryByRole("button", { name: cards[slug as keyof typeof cards].title })).toBe(
        null,
      );
    }
  });

  it("titles the page with the learn screen's own title", () => {
    renderWithProviders(<HabitsScreen />);

    expect(h1Text()).toBe(indexTitle);
    expect(screen.getByText(indexSubtitle)).toBeTruthy();
  });

  /**
   * ☠️ **Comparing the rendered titles does NOT prove the body is shared** - a
   * forked copy-paste of the ten cards renders the same ten titles in the same
   * order and passes that comparison happily. So the identity is asserted where
   * it actually lives: the same COMPONENT is mounted in both trees, read off the
   * tree by type. The text comparison stays beside it, for the different failure
   * of a shared body that renders the wrong ten.
   */
  it("renders the gated index screen's ten cards, out of the one shared body", () => {
    renderWithProviders(<HabitsScreen />);
    const publicTitles = headingTexts().filter((text) => text !== indexTitle);

    expect(screen.UNSAFE_getAllByType(HabitsLearnCardsBody)).toHaveLength(1);

    screen.unmount();
    renderWithProviders(<HabitsLearnIndexScreen />);
    const gatedRowNames = screen
      .getAllByRole("button")
      .map((node) => node.props.accessibilityLabel)
      .filter((label): label is string => typeof label === "string");

    expect(screen.UNSAFE_getAllByType(HabitsLearnCardsBody)).toHaveLength(1);
    expect(publicTitles).toEqual(
      HABITS_LEARN_CARDS.map(({ slug }) => cards[slug as keyof typeof cards].title),
    );
    // ☠️ The gated rows carry the same ten names **in the same order**, which
    // `expect.arrayContaining` would NOT check - it is order-insensitive, so it
    // passes on a shuffled list. The card names are filtered out of the row
    // names and compared as an ordered array instead.
    expect(gatedRowNames.filter((name) => publicTitles.includes(name))).toEqual(publicTitles);
    // The one extra button is `ScreenEscape`, which `ScreenHeader` renders
    // unconditionally (#1250) - NOT the breadcrumb, which this file mocks to
    // null above.
    expect(gatedRowNames).toHaveLength(publicTitles.length + 1);
  });

  /**
   * ☠️ The composed title reads with TWO hyphens - "Habit building - core ideas
   * - Selftend" - because the page title carries its own and the template adds
   * the site's. Accepted on #2470 and pinned here: the rule is the existing app
   * string unchanged (§ 5), so smoothing this is a decision, not a tidy-up.
   */
  it("composes the document title through the template and the description from the subline", () => {
    renderWithProviders(<HabitsScreen />);

    const documentTitle = tags().find(({ type }) => type === "title")?.props.children as string;

    expect(documentTitle).toBe(`${indexTitle} - Selftend`);
    expect(documentTitle).toBe("Habit building - core ideas - Selftend");
    expect(meta("description").map(({ props }) => props.content)).toEqual([indexSubtitle]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([documentTitle]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([indexSubtitle]);
  });

  it("points og:url and the canonical at https://selftend.org/habits", () => {
    renderWithProviders(<HabitsScreen />);

    expect(meta("og:url").map(({ props }) => props.content)).toEqual([
      "https://selftend.org/habits",
    ]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/habits"]);
  });

  it("emits no structured-data block", () => {
    renderWithProviders(<HabitsScreen />);

    // Anti-vacuity: the head is populated, so the absence below is an absence
    // of ld+json rather than an absence of any captured tag at all.
    expect(tags().length).toBeGreaterThanOrEqual(6);
    expect(tags().filter(({ props }) => props.type === STRUCTURED_DATA_TYPE)).toEqual([]);
  });
});
