import { appEnv } from "@/src/lib/env";
import { SHARE_IMAGE_URL, SITE_NAME } from "@/src/lib/site";
import { STRUCTURED_DATA_TYPE, landingStructuredData } from "@/src/lib/structured-data";

type Node = Record<string, unknown>;

const URL = "https://selftend.org/";

const graphOf = (description = "A frame sentence.", language = "en") => {
  const block = landingStructuredData({ url: URL, description, language });
  const [organization, webSite] = block["@graph"] as Node[];
  return { block, organization, webSite };
};

describe("landingStructuredData (#2296)", () => {
  it("is one schema.org graph of exactly two nodes", () => {
    const { block } = graphOf();

    expect(block["@context"]).toBe("https://schema.org");
    expect((block["@graph"] as Node[]).map((node) => node["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
    expect(STRUCTURED_DATA_TYPE).toBe("application/ld+json");
  });

  // docs/indexability.md § 5: name, url, logo, description, sameAs - and the
  // id the WebSite points at. Nothing else, so a property the ruling refused
  // cannot arrive as a helpful addition.
  it("gives the Organization exactly the decided properties", () => {
    const { organization } = graphOf("The frame.");

    expect(Object.keys(organization).sort()).toEqual(
      ["@id", "@type", "description", "logo", "name", "sameAs", "url"].sort(),
    );
    expect(organization).toMatchObject({
      "@id": "https://selftend.org/#organization",
      name: SITE_NAME,
      url: URL,
      logo: SHARE_IMAGE_URL,
      description: "The frame.",
    });
    expect(SITE_NAME).toBe("Selftend");
    expect(SHARE_IMAGE_URL).toBe("https://selftend.org/favicon-512.png");
  });

  it("links the repository, the subreddit and the channel from the env constants, in that order", () => {
    const { organization } = graphOf();

    expect(organization.sameAs).toEqual([
      appEnv.githubRepoUrl,
      appEnv.redditUrl,
      appEnv.youtubeUrl,
    ]);
    expect(organization.sameAs).toEqual([
      "https://github.com/Selftend/selftend",
      "https://www.reddit.com/r/Selftend/",
      "https://www.youtube.com/@Selftend",
    ]);
  });

  // A fork drops a link with an empty env value - the footer and the user
  // menu already render nothing for it - and an empty sameAs entry is a
  // validator error, so the entry goes rather than an empty string.
  it("drops a link a fork has blanked, and keeps the others in order", () => {
    jest.isolateModules(() => {
      jest.doMock("@/src/lib/env", () => ({
        appEnv: {
          githubRepoUrl: "https://github.com/fork/selftend",
          redditUrl: "",
          youtubeUrl: "",
        },
      }));
      const isolated =
        require("@/src/lib/structured-data") as typeof import("@/src/lib/structured-data");

      const [organization] = isolated.landingStructuredData({
        url: URL,
        description: "x",
        language: "en",
      })["@graph"] as Node[];

      expect(organization.sameAs).toEqual(["https://github.com/fork/selftend"]);
    });
  });

  // § 5: name, url, publisher by @id, and the two truthful properties from
  // brand-result.md § 6 (#2468) - no alternateName, no SearchAction, and no
  // id of its own: nothing points at the WebSite.
  it("gives the WebSite exactly the decided properties, publisher by id", () => {
    const { webSite, organization } = graphOf();

    expect(Object.keys(webSite).sort()).toEqual(
      ["@type", "inLanguage", "isAccessibleForFree", "name", "publisher", "url"].sort(),
    );
    expect(webSite).toEqual({
      "@type": "WebSite",
      name: SITE_NAME,
      url: URL,
      publisher: { "@id": organization["@id"] },
      isAccessibleForFree: true,
      inLanguage: "en",
    });
  });

  // brand-result.md § 6: `inLanguage` restates the rendered `<html lang>`,
  // which is the visitor's language after hydration (indexability.md § 4.4).
  // So it is the caller's read, never a literal - a hardcoded "en" would be
  // false in the DOM for a Bulgarian visitor. It belongs to the WebSite (a
  // CreativeWork) only; `Organization` has no such property.
  it("takes the language from the caller, on the WebSite only", () => {
    const en = graphOf("x", "en");
    const bg = graphOf("x", "bg");

    expect(en.webSite.inLanguage).toBe("en");
    expect(bg.webSite.inLanguage).toBe("bg");
    for (const { organization } of [en, bg]) {
      expect(organization).not.toHaveProperty("inLanguage");
      expect(organization).not.toHaveProperty("isAccessibleForFree");
    }
  });

  // The address is the caller's, not a read of its own: the head passes the
  // url it renders as og:url, so the two cannot drift.
  it("takes the address from the caller", () => {
    const [organization, webSite] = landingStructuredData({
      url: "https://example.test/",
      description: "x",
      language: "en",
    })["@graph"] as Node[];

    expect(organization.url).toBe("https://example.test/");
    expect(organization["@id"]).toBe("https://example.test/#organization");
    expect(webSite.url).toBe("https://example.test/");
    expect(webSite.publisher).toEqual({ "@id": "https://example.test/#organization" });
  });

  // Each of these is a decision on #2291 or #2405, not an omission: no
  // registered entity exists, no person is the product, no contact channel,
  // no store listing, no rating or review, no refused type - and none of the
  // properties brand-result.md § 6 refused because no page displays them.
  it("carries none of the refused properties, values or types", () => {
    const text = JSON.stringify(
      landingStructuredData({ url: URL, description: "The frame.", language: "en" }),
    );

    for (const refused of [
      "nonprofitStatus",
      "founder",
      "Person",
      "email",
      "contactPoint",
      "aggregateRating",
      "review",
      "alternateName",
      "SearchAction",
      "potentialAction",
      "FAQPage",
      "SoftwareApplication",
      "knowsAbout",
      "foundingDate",
      "slogan",
      "publishingPrinciples",
      "license",
      "BreadcrumbList",
      appEnv.playStoreUrl,
      appEnv.appStoreUrl,
      appEnv.discordUrl,
      appEnv.sponsorsUrl,
    ]) {
      expect({ refused, present: text.includes(refused) }).toEqual({ refused, present: false });
    }
  });
});
