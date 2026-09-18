import { act, render } from "@testing-library/react-native";

import i18n from "@/src/i18n";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { meta, rendered, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { SiteHead } from "../site-head";
import { LandingHead } from "./landing-head";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

beforeEach(() => {
  reset();
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
      // Beat two removed 2026-09-18 by owner instruction - the modules are beta, so the
      // method is named on no surface. `docs/positioning.md` § 3 records the retreat.
      "Selftend is a set of free, private mental health tools: everyday tools for right now, yours to pick from at whatever pace suits you. Open source, no ads, no subscriptions.",
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

    expect(rendered()).toBe(false);
  });
});

describe("the structured-data block (#2296)", () => {
  /** The one `application/ld+json` script the landing head emits, parsed. */
  const block = () => {
    const scripts = tags().filter(
      ({ type, props }) => type === "script" && props.type === "application/ld+json",
    );
    expect(scripts).toHaveLength(1);
    const parsed = JSON.parse(scripts[0].props.children as string) as {
      "@graph": Record<string, unknown>[];
    };
    const [organization, webSite] = parsed["@graph"];
    return { parsed, organization, webSite };
  };

  it("carries one block of two nodes, Organization then WebSite", () => {
    render(<LandingHead />);

    const { parsed, organization, webSite } = block();
    expect(parsed["@graph"]).toHaveLength(2);
    expect(organization["@type"]).toBe("Organization");
    expect(webSite["@type"]).toBe("WebSite");
    expect(webSite.publisher).toEqual({ "@id": organization["@id"] });
  });

  // docs/indexability.md § 5's pin: the block cannot disagree with the visible
  // page. The description is the rendered meta description - the same string
  // from the same read - and the logo is the share image the site head
  // renders as og:image. Both are read back from the tags, not from the keys.
  it("pins the description to the rendered meta description and the logo to og:image", () => {
    render(
      <>
        <SiteHead />
        <LandingHead />
      </>,
    );

    const { organization } = block();
    expect(meta("description")).toHaveLength(1);
    expect(organization.description).toBe(meta("description")[0].props.content);
    expect(meta("og:image")).toHaveLength(1);
    expect(organization.logo).toBe(meta("og:image")[0].props.content);
  });

  // brand-result.md § 6 (#2468): the two truthful properties. Which node
  // carries them is pinned by the module's own key-set assertion; what this
  // test can prove and that one cannot is the tie to the document. The
  // `inLanguage` is read back from the rendered `<html lang>` the site head
  // owns, never from a literal, so the block cannot disagree with the page
  // it sits in. `isAccessibleForFree` restates the landing's visible "Free ·
  // Open source · Private" and "No ads, no subscriptions" - a boolean, so no
  // assertion here can tie the value itself to rendered copy. What can be
  // tied is its justification, and `landing-screen.test.tsx` ties it, where
  // that copy renders: blank the hero eyebrow and that case fails.
  it("pins the WebSite's inLanguage to the rendered <html lang>, and says the site is free", () => {
    render(
      <>
        <SiteHead />
        <LandingHead />
      </>,
    );

    const { webSite } = block();
    const lang = tags().filter(({ type }) => type === "html");
    expect(lang).toHaveLength(1);
    expect(lang[0].props.lang).toBe("en");
    expect(webSite.inLanguage).toBe(lang[0].props.lang);
    expect(webSite.isAccessibleForFree).toBe(true);
  });

  it("follows the visitor's language after hydration, with the meta description and <html lang>", async () => {
    i18n.addResourceBundle("bg", "auth", bgAuth, true, true);
    await act(() => i18n.changeLanguage("bg"));

    render(
      <>
        <SiteHead />
        <LandingHead />
      </>,
    );

    const { organization, webSite } = block();
    expect(organization.description).toBe(bgAuth.landingPage.metaDescription);
    expect(organization.description).toBe(meta("description")[0].props.content);
    expect(tags().find(({ type }) => type === "html")?.props.lang).toBe("bg");
    expect(webSite.inLanguage).toBe("bg");
  });

  // The block is a data block: nothing executable, and it is the only script
  // this head emits - no JavaScript for the CSP's inline hashes to cover.
  it("is the only script this head emits, and it is not JavaScript", () => {
    render(<LandingHead />);

    const scripts = tags().filter(({ type }) => type === "script");
    expect(scripts.map(({ props }) => props.type)).toEqual(["application/ld+json"]);
    expect(scripts[0].props.src).toBeUndefined();
  });
});
