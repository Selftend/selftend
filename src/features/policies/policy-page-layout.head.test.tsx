import { act, screen } from "@testing-library/react-native";

import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import i18n from "@/src/i18n";
import bgCommon from "@/src/i18n/locales/bg/common.json";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";
import enSecurity from "@/src/i18n/locales/en/security.json";
import { h1Text } from "@/test/h1";
import { meta, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The invariant docs/indexability.md § 4.3 makes structural and § 7 pins:
 * **document title = on-page H1 through the template, description = the
 * subline**, for a representative route in both locales (#2294). Both halves
 * are read back from the RENDERED tree, never from the props, so a layout that
 * titled the document from one string and the page from another goes red.
 */

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

let mockPathname = "/crisis";
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

const TEMPLATE = /^(.+) - Selftend$/;

/** What the page shows as its H1 and its subline, read from the tree. */
function pageShows(subline: string) {
  const muted = screen.getByText(subline);
  return { h1: h1Text(), subline: muted.props.children as string };
}

beforeEach(() => {
  reset();
  mockPathname = "/crisis";
  setPlatformOS("web");
});

afterEach(async () => {
  setPlatformOS("ios");
  await act(() => i18n.changeLanguage("en"));
});

describe("PolicyPageLayout - document title = on-page H1 (#2294)", () => {
  it("in English: the title is the rendered H1 through the template, the description the rendered subline", () => {
    const { pageTitle, pageDescription } = enPolicies.crisis;
    renderWithProviders(
      <PolicyPageLayout
        title={pageTitle}
        description={pageDescription}
        subtitle={pageDescription}
      />,
    );

    const page = pageShows(pageDescription);
    const documentTitle = tags().find(({ type }) => type === "title")?.props.children as string;

    expect(documentTitle).toMatch(TEMPLATE);
    expect(documentTitle.replace(TEMPLATE, "$1")).toBe(page.h1);
    expect(meta("description").map(({ props }) => props.content)).toEqual([page.subline]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([documentTitle]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([page.subline]);
    expect(meta("og:url").map(({ props }) => props.content)).toEqual([
      "https://selftend.org/crisis",
    ]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/crisis"]);
  });

  it("in Bulgarian: the same relation holds over the translated strings", async () => {
    i18n.addResourceBundle("bg", "common", bgCommon, true, true);
    i18n.addResourceBundle("bg", "policies", bgPolicies, true, true);
    await act(() => i18n.changeLanguage("bg"));
    const { pageTitle, pageDescription } = bgPolicies.crisis;

    renderWithProviders(
      <PolicyPageLayout
        title={pageTitle}
        description={pageDescription}
        subtitle={pageDescription}
      />,
    );

    const page = pageShows(pageDescription);
    const documentTitle = tags().find(({ type }) => type === "title")?.props.children as string;

    expect(page.h1).toBe("Кризисно ръководство");
    expect(documentTitle).toBe(`${page.h1} - Selftend`);
    expect(meta("description").map(({ props }) => props.content)).toEqual([page.subline]);
  });

  // The spec's § 4.1 table, verbatim: every non-landing title is "<H1> -
  // Selftend" from the route's EXISTING key, and the description its existing
  // subline. Pinned as the literals so a reworded key fails somewhere a
  // reviewer reads rather than silently changing a search result.
  it("the seven routes' titles and sublines are the spec's table, verbatim", () => {
    expect([
      ...(["faq", "crisis", "privacy", "terms", "cookies", "accountDeletion"] as const).map(
        (route) => `${enPolicies[route].pageTitle} - Selftend`,
      ),
      `${enSecurity.page.pageTitle} - Selftend`,
    ]).toEqual([
      "Common questions - Selftend",
      "Crisis guidance - Selftend",
      "Privacy policy - Selftend",
      "Terms of service - Selftend",
      "Cookie policy - Selftend",
      "Account deletion - Selftend",
      "How we protect your data - Selftend",
    ]);
    expect(enPolicies.crisis.pageDescription).toBe(
      "This app is not emergency support and is not monitored. If you are in danger, contact local emergency services.",
    );
  });
});
