import { act, render } from "@testing-library/react-native";

import i18n from "@/src/i18n";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { meta, rendered, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { SiteHead } from "./site-head";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

beforeEach(() => {
  reset();
  setPlatformOS("web");
});

afterEach(async () => {
  setPlatformOS("ios");
  await act(() => i18n.changeLanguage("en"));
});

describe("SiteHead (#2293)", () => {
  // Inherit only what names the site (docs/indexability.md § 4.2).
  it("carries the site constants, once each", () => {
    render(<SiteHead />);

    const expected: Record<string, string> = {
      "og:type": "website",
      "og:site_name": "Selftend",
      "og:image": "https://selftend.org/favicon-512.png",
      "og:image:width": "512",
      "og:image:height": "512",
      "og:image:alt": enAuth.landingPage.shareImageAlt,
      "og:locale": "en_GB",
      "twitter:card": "summary",
    };
    for (const [named, content] of Object.entries(expected)) {
      expect({ named, contents: meta(named).map(({ props }) => props.content) }).toEqual({
        named,
        contents: [content],
      });
    }
  });

  // Every unfurler falls back to og:*; the trio was pure duplication.
  it("drops twitter:title, twitter:description and twitter:image", () => {
    render(<SiteHead />);

    for (const named of ["twitter:title", "twitter:description", "twitter:image"]) {
      expect({ named, count: meta(named).length }).toEqual({ named, count: 0 });
    }
  });

  // What names a page is each screen's own: the site head never claims an
  // address, or the landing's canonical would leak onto every other file.
  it("names no page", () => {
    render(<SiteHead />);

    expect(meta("og:title")).toEqual([]);
    expect(meta("og:description")).toEqual([]);
    expect(meta("og:url")).toEqual([]);
    expect(tags().some(({ type, props }) => type === "link" && props.rel === "canonical")).toBe(
      false,
    );
  });

  // STOPGAP until #2294 gives every public screen its own title and
  // description: the shared defaults are the landing's two keys, so the other
  // public files do not export headless. Delete this test with the stopgap.
  it("carries the landing's title and description as the shared defaults, for now", () => {
    render(<SiteHead />);

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: enAuth.landingPage.metaTitle } },
    ]);
    expect(meta("description").map(({ props }) => props.content)).toEqual([
      enAuth.landingPage.metaDescription,
    ]);
  });

  // § 4.4: the sole owner of <html lang>. `en` in the exported file (i18next's
  // default in Node), the visitor's language after hydration - and the one
  // translated site constant, the share image's alt, follows it.
  it("owns <html lang>, and it follows the language", async () => {
    const first = render(<SiteHead />);
    expect(
      tags()
        .filter(({ type }) => type === "html")
        .map(({ props }) => props.lang),
    ).toEqual(["en"]);

    first.unmount();
    reset();
    i18n.addResourceBundle("bg", "auth", bgAuth, true, true);
    await act(() => i18n.changeLanguage("bg"));
    render(<SiteHead />);
    expect(
      tags()
        .filter(({ type }) => type === "html")
        .map(({ props }) => props.lang),
    ).toEqual(["bg"]);
    expect(meta("og:image:alt")[0].props.content).toBe(bgAuth.landingPage.shareImageAlt);
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<SiteHead />);

    expect(rendered()).toBe(false);
  });
});
