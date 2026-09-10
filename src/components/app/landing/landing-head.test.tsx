import { act, render } from "@testing-library/react-native";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

import i18n from "@/src/i18n";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { LandingHead } from "./landing-head";

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

describe("LandingHead (#2293)", () => {
  const TITLE = enAuth.landingPage.metaTitle;
  const DESCRIPTION = enAuth.landingPage.metaDescription;

  it("owns what names the page, from the two keys and the apex root", () => {
    render(<LandingHead />);

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: TITLE } },
    ]);
    expect(meta("description").map(({ props }) => props.content)).toEqual([DESCRIPTION]);
    expect(meta("og:title").map(({ props }) => props.content)).toEqual([TITLE]);
    expect(meta("og:description").map(({ props }) => props.content)).toEqual([DESCRIPTION]);
    expect(meta("og:url").map(({ props }) => props.content)).toEqual(["https://selftend.org/"]);
    expect(
      tags()
        .filter(({ type, props }) => type === "link" && props.rel === "canonical")
        .map(({ props }) => props.href),
    ).toEqual(["https://selftend.org/"]);
  });

  // The strings are the old public/index.html literals, moved. Pinned here as
  // literals too, so a "tidy" of the key silently changing the served title
  // fails somewhere a reviewer reads.
  it("carries the decided short form and the frame description verbatim", () => {
    expect(TITLE).toBe("Selftend - private mental health tools");
    expect(DESCRIPTION).toBe(
      "Selftend is a set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one. Open source, no ads, no subscriptions.",
    );
  });

  // Inherit only what names the site: none of the site constants are
  // re-declared here, and the twitter:* trio is gone from the product.
  it("declares nothing that belongs to the site", () => {
    render(<LandingHead />);

    for (const named of [
      "og:type",
      "og:site_name",
      "og:image",
      "og:locale",
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
    ]) {
      expect({ named, count: meta(named).length }).toEqual({ named, count: 0 });
    }
    expect(tags().some(({ type }) => type === "html")).toBe(false);
  });

  it("follows the visitor's language after hydration", async () => {
    i18n.addResourceBundle("bg", "auth", bgAuth, true, true);
    await act(() => i18n.changeLanguage("bg"));

    render(<LandingHead />);

    expect(tags().find(({ type }) => type === "title")?.props.children).toBe(
      bgAuth.landingPage.metaTitle,
    );
    expect(meta("description")[0].props.content).toBe(bgAuth.landingPage.metaDescription);
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<LandingHead />);

    expect(captured).toEqual([]);
  });
});
