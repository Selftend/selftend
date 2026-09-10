import { act, render } from "@testing-library/react-native";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

import i18n from "@/src/i18n";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { SiteHead } from "./site-head";

// Helmet is not under test; what reaches it is. The mock records every
// <Head> render's children so the assertions read the tags as elements.
const captured: ReactNode[] = [];
jest.mock("expo-router/head", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => {
    captured.push(children);
    return null;
  },
}));

type Tag = { type: string; props: Record<string, unknown> };

function tags(): Tag[] {
  return Children.toArray(captured.flat())
    .filter((node): node is ReactElement<Record<string, unknown>> => isValidElement(node))
    .filter((node) => typeof node.type === "string")
    .map((node) => ({ type: node.type as string, props: node.props }));
}

function meta(named: string): Tag[] {
  return tags().filter(
    ({ type, props }) => type === "meta" && (props.name === named || props.property === named),
  );
}

beforeEach(() => {
  captured.length = 0;
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
      "og:image:alt": "The Selftend app icon",
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
  // default in Node), the visitor's language after hydration.
  it("owns <html lang>, and it follows the language", async () => {
    const first = render(<SiteHead />);
    expect(
      tags()
        .filter(({ type }) => type === "html")
        .map(({ props }) => props.lang),
    ).toEqual(["en"]);

    first.unmount();
    captured.length = 0;
    i18n.addResourceBundle("bg", "auth", bgAuth, true, true);
    await act(() => i18n.changeLanguage("bg"));
    render(<SiteHead />);
    expect(
      tags()
        .filter(({ type }) => type === "html")
        .map(({ props }) => props.lang),
    ).toEqual(["bg"]);
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<SiteHead />);

    expect(captured).toEqual([]);
  });
});
