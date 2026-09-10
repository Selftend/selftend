import { act, render } from "@testing-library/react-native";

import i18n from "@/src/i18n";
import bgCommon from "@/src/i18n/locales/bg/common.json";
import enCommon from "@/src/i18n/locales/en/common.json";
import { meta, rendered, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { RouteHead } from "./route-head";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

let mockPathname = "/crisis";
jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  reset();
  mockPathname = "/crisis";
  setPlatformOS("web");
});

afterEach(async () => {
  setPlatformOS("ios");
  await act(() => i18n.changeLanguage("en"));
});

describe("RouteHead (#2294)", () => {
  // Own what names the page: the six tags, from two strings plus the path.
  it("names the page from its H1 through the template, its subline, and the apex path", () => {
    render(<RouteHead title="Crisis guidance" description="Not emergency support." />);

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: "Crisis guidance - Selftend" } },
    ]);
    expect(meta("description").map(({ props }) => props.content)).toEqual([
      "Not emergency support.",
    ]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([
      "Crisis guidance - Selftend",
    ]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([
      "Not emergency support.",
    ]);
    expect(meta("og:url").map(({ props }) => props.content)).toEqual([
      "https://selftend.org/crisis",
    ]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/crisis"]);
  });

  // The template is the one key every non-landing title composes through:
  // hyphen, page word first (docs/indexability.md § 4.1).
  it("composes through common:documentTitle, whose shape is pinned in both locales", () => {
    expect(enCommon.documentTitle).toBe("{{page}} - Selftend");
    expect(bgCommon.documentTitle).toBe("{{page}} - Selftend");
  });

  // No trailing slash on any path but the root; the canonical, the sitemap and
  // the served URL agree byte for byte.
  it("follows the router's path, slashless", () => {
    mockPathname = "/account-deletion/";

    render(<RouteHead title="Account deletion" description="How to delete." />);

    expect(meta("og:url")[0].props.content).toBe("https://selftend.org/account-deletion");
  });

  // Inherit only what names the site: nothing of SiteHead's is re-declared.
  it("declares nothing that belongs to the site", () => {
    render(<RouteHead title="Crisis guidance" description="Not emergency support." />);

    for (const named of ["og:type", "og:site_name", "og:image", "og:locale", "twitter:card"]) {
      expect({ named, count: meta(named).length }).toEqual({ named, count: 0 });
    }
    expect(tags().some(({ type }) => type === "html")).toBe(false);
    expect(meta("robots")).toEqual([]);
  });

  it("follows the visitor's language after hydration", async () => {
    i18n.addResourceBundle("bg", "common", bgCommon, true, true);
    await act(() => i18n.changeLanguage("bg"));

    render(<RouteHead title="Кризисно ръководство" description="Не е спешна подкрепа." />);

    expect(tags().find(({ type }) => type === "title")?.props.children).toBe(
      "Кризисно ръководство - Selftend",
    );
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<RouteHead title="Crisis guidance" description="Not emergency support." />);

    expect(rendered()).toBe(false);
  });
});
