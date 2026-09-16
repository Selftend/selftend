import { fireEvent, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { SITE_FOOTER_LINKS, SiteFooter } from "./site-footer";
import enCommon from "@/src/i18n/locales/en/common.json";
import enMeditation from "@/src/i18n/locales/en/meditation.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";
import enSecurity from "@/src/i18n/locales/en/security.json";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  Link: require("@/test/expo-router-link-mock").MockLink,
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/privacy",
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

// ☠️ This factory REPLACES `appEnv`, it does not extend it: a URL the footer
// reads and this object omits arrives as `undefined`, which is falsy, so the
// link would simply never render and a presence test would fail for a reason
// that has nothing to do with the component.
jest.mock("@/src/lib/env", () => ({
  appEnv: {
    discordUrl: "https://discord.gg/pdaAr9FhcQ",
    redditUrl: "https://www.reddit.com/r/Selftend/",
    youtubeUrl: "https://www.youtube.com/@Selftend",
  },
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

// The one list that decides what is public (docs/indexability.md § 3), read
// from the export script's module rather than restated: the pin below is only
// a pin if it cannot drift from the thing it pins.
const { INDEX_LIST } = require("@/scripts/lib/index-list") as { INDEX_LIST: readonly string[] };

/** Every rendered link target, in tree order. */
function renderedHrefs(): string[] {
  return screen.getAllByRole("link").map((node) => node.props.href as string);
}

function linkHref(name: string) {
  return screen.getByRole("link", { name }).props.href as string;
}

/**
 * ☠️ RNTL's role queries cannot see a plain `View role="…"` - they filter on
 * `isAccessibilityElement`, which a host View without `accessible` fails - so
 * the landmarks are read off the raw tree. `UNSAFE_getAllByProps` returns the
 * composite AND the host node for one element; the host is the one that
 * carries the element react-native-web will render.
 */
function hostViewsWithRole(role: string) {
  return screen.UNSAFE_getAllByProps({ role }).filter((node) => node.type === View);
}

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";
  appEnv.redditUrl = "https://www.reddit.com/r/Selftend/";
  appEnv.youtubeUrl = "https://www.youtube.com/@Selftend";
  jest.clearAllMocks();
});

/**
 * One footer on every public page, listing every public page (#2467,
 * docs/brand-result.md § 7). The framing is navigability for a person who
 * landed cold on a policy page with no session; the pin at the end is what
 * keeps a future public route from landing orphaned.
 */
describe("SiteFooter", () => {
  it("opens with the full safety description", () => {
    renderWithProviders(<SiteFooter />);

    expect(screen.getByText(enCommon.safety.description)).toBeTruthy();
  });

  /**
   * The crisis row IS the site's link to `/crisis` - a real anchor, so a
   * crawler, a middle-click and a screen reader all agree it is one (§ 7.4;
   * the prototype found the exported HTML held no link to `/crisis` at all,
   * because `CrisisSupportBar` is a Pressable with no href). It keeps its
   * imperative label: an affordance, not a table of contents (§ 7.3).
   */
  it("links to crisis guidance once, as the crisis row", () => {
    renderWithProviders(<SiteFooter />);

    expect(linkHref(enCommon.safety.openCrisis)).toBe("/crisis");
    expect(renderedHrefs().filter((href) => href === "/crisis")).toHaveLength(1);
  });

  /**
   * The anchor-text rule (§ 7.3): a link to a public page is labelled with that
   * page's H1 - the same string its `<title>` already carries. No new copy, and
   * the label arrives in both locales for free. The landing's "FAQ" is the one
   * visible consequence: it now reads "Common questions".
   */
  it("labels every policy link with its page's H1", () => {
    renderWithProviders(<SiteFooter />);

    expect(linkHref(enPolicies.faq.pageTitle)).toBe("/faq");
    expect(linkHref(enPolicies.privacy.pageTitle)).toBe("/privacy");
    expect(linkHref(enPolicies.terms.pageTitle)).toBe("/terms");
    expect(linkHref(enPolicies.cookies.pageTitle)).toBe("/cookies");
    expect(linkHref(enSecurity.page.pageTitle)).toBe("/security");
    expect(linkHref(enPolicies.accountDeletion.pageTitle)).toBe("/account-deletion");
    expect(screen.queryByText("FAQ")).toBeNull();
  });

  /**
   * The same rule on the first explainer (#2469), and the one entry where the
   * destination's H1 is NOT its screen's own title: `/meditation` is titled with
   * the module's name because `meditation:module.learn.title` - "Learn the
   * framework" - is an instruction that names no topic to a stranger, and this
   * footer is exactly where it would be read as one, on every public page
   * (docs/brand-result.md § 3.2). Both halves are asserted: the label that IS
   * used, and the label that must not be.
   */
  it("labels the explainer row with the module's name, not the learn screen's instruction", () => {
    renderWithProviders(<SiteFooter />);

    expect(linkHref(enMeditation.module.home.title)).toBe("/meditation");
    expect(screen.queryByText(enMeditation.module.learn.title)).toBeNull();
  });

  /**
   * `/` is not listed: the header's brand mark links it on every page, and it is
   * also the explainer pages' quiet route into the app (§ 7.2). A second entry
   * beside the brand mark would be a call to action wearing a footer.
   */
  it("does not list the root", () => {
    renderWithProviders(<SiteFooter />);

    expect(renderedHrefs()).not.toContain("/");
  });

  /**
   * ⭐ THE PIN - the fourth on the index list (§ 7.6). The rendered hrefs equal
   * the index list minus `/`, in list order, read from the export script's
   * module. A route added to the list fails here until the footer knows it, so
   * a future public route cannot ship orphaned; a route the footer names that
   * the list does not fails here too. Ordered, so the sitemap and the footer read
   * the same sequence. A source grep was refused: it matches a string, not an edge.
   */
  it("renders exactly the index list minus the root, in list order", () => {
    renderWithProviders(<SiteFooter />);

    const expected = INDEX_LIST.filter((route) => route !== "/");
    // Anti-vacuity: the list is read at runtime, so an empty read would make
    // the equality below pass on a footer that renders nothing.
    expect(expected.length).toBeGreaterThanOrEqual(8);
    expect(renderedHrefs()).toEqual(expected);
  });

  /**
   * The same pin on the map the labels come from: its keys are the list, so a
   * new route needs a label before the footer can render it, and the label is
   * an i18n key that both locale gates then hold.
   */
  it("keys its anchor map by the index list minus the root, in list order", () => {
    expect(SITE_FOOTER_LINKS.map((link) => link.href)).toEqual(
      INDEX_LIST.filter((route) => route !== "/"),
    );
  });

  /**
   * On web the footer is a `<footer>` holding a `<nav>` (react-native-web maps
   * `role="contentinfo"` and `role="navigation"` to those elements) - what the
   * thing is, for a screen reader's landmark list. Nothing else on any page
   * changes its element.
   */
  it("renders as a contentinfo landmark holding one navigation landmark", () => {
    renderWithProviders(<SiteFooter />);

    expect(hostViewsWithRole("contentinfo")).toHaveLength(1);
    expect(hostViewsWithRole("navigation")).toHaveLength(1);
  });

  /**
   * Order is the ruling (§ 7.2): the safety description, the crisis row, the nav
   * list, the social links. Read as the text nodes' tree order so a rearranged
   * footer that still contains every piece fails.
   */
  it("carries the safety description, the crisis row, the nav list and the social links, in that order", () => {
    renderWithProviders(<SiteFooter />);

    const texts = screen
      .getAllByText(/./)
      .map((node) => node.props.children)
      .filter((child): child is string => typeof child === "string");

    const indexOf = (text: string) => texts.indexOf(text);
    expect(indexOf(enCommon.safety.description)).toBeGreaterThanOrEqual(0);
    expect(indexOf(enCommon.safety.openCrisis)).toBeGreaterThan(
      indexOf(enCommon.safety.description),
    );
    // The nav list's two rows in their own order (#2469): the explainers, then
    // the policies. Asserted here rather than only through the ordered pin
    // because this is the reading order a person meets, and the pin would still
    // pass on a list that put the policies first.
    expect(indexOf(enMeditation.module.home.title)).toBeGreaterThan(
      indexOf(enCommon.safety.openCrisis),
    );
    expect(indexOf(enPolicies.faq.pageTitle)).toBeGreaterThan(
      indexOf(enMeditation.module.home.title),
    );
    expect(indexOf(enPolicies.accountDeletion.pageTitle)).toBeGreaterThan(
      indexOf(enPolicies.faq.pageTitle),
    );
    expect(indexOf("Join our Discord")).toBeGreaterThan(
      indexOf(enPolicies.accountDeletion.pageTitle),
    );
  });

  it("opens Discord externally when appEnv.discordUrl is set", () => {
    renderWithProviders(<SiteFooter />);

    fireEvent.press(screen.getByText("Join our Discord"));

    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");
  });

  it("hides the Discord link when appEnv.discordUrl is empty", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<SiteFooter />);

    expect(screen.queryByText("Join our Discord")).toBeNull();
  });

  it("opens the subreddit externally when appEnv.redditUrl is set", () => {
    renderWithProviders(<SiteFooter />);

    fireEvent.press(screen.getByText("Join r/Selftend"));

    expect(mockOpen).toHaveBeenCalledWith("https://www.reddit.com/r/Selftend/");
  });

  it("hides the subreddit link when appEnv.redditUrl is empty, keeping Discord", () => {
    appEnv.redditUrl = "";

    renderWithProviders(<SiteFooter />);

    expect(screen.queryByText("Join r/Selftend")).toBeNull();
    expect(screen.getByText("Join our Discord")).toBeTruthy();
  });

  it("opens the YouTube channel externally when appEnv.youtubeUrl is set", () => {
    renderWithProviders(<SiteFooter />);

    fireEvent.press(screen.getByText("Watch on YouTube"));

    expect(mockOpen).toHaveBeenCalledWith("https://www.youtube.com/@Selftend");
  });

  it("hides the YouTube link when appEnv.youtubeUrl is empty, keeping its neighbours", () => {
    appEnv.youtubeUrl = "";

    renderWithProviders(<SiteFooter />);

    expect(screen.queryByText("Watch on YouTube")).toBeNull();
    expect(screen.getByText("Join our Discord")).toBeTruthy();
    expect(screen.getByText("Join r/Selftend")).toBeTruthy();
  });

  it("closes with Discord, the subreddit, then YouTube", () => {
    renderWithProviders(<SiteFooter />);

    // Order is the assertion: all three are external buttons appended to the
    // same wrapping row, so any of them could land anywhere in it and still be
    // found by the presence checks above. `getAllByText` returns tree order.
    expect(screen.getAllByText(/^(Join|Watch) /).map((node) => node.props.children)).toEqual([
      "Join our Discord",
      "Join r/Selftend",
      "Watch on YouTube",
    ]);
  });
});
