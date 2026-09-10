import { appEnv } from "@/src/lib/env";
import { SHARE_IMAGE_URL, SITE_NAME } from "@/src/lib/site";
import { STRUCTURED_DATA_TYPE, landingStructuredData } from "@/src/lib/structured-data";

type Node = Record<string, unknown>;

const graphOf = (description = "A frame sentence.") => {
  const block = landingStructuredData(description);
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
      url: "https://selftend.org/",
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

  // § 5: name, url, publisher by @id - no alternateName, no SearchAction.
  it("gives the WebSite exactly the decided properties, publisher by id", () => {
    const { webSite, organization } = graphOf();

    expect(Object.keys(webSite).sort()).toEqual(
      ["@id", "@type", "name", "publisher", "url"].sort(),
    );
    expect(webSite).toEqual({
      "@type": "WebSite",
      "@id": "https://selftend.org/#website",
      name: SITE_NAME,
      url: "https://selftend.org/",
      publisher: { "@id": organization["@id"] },
    });
  });

  // Each of these is a decision on #2291, not an omission: no registered
  // entity exists, no person is the product, no contact channel, no store
  // listing, no rating or review, and no refused type.
  it("carries none of the refused properties, values or types", () => {
    const text = JSON.stringify(landingStructuredData("The frame."));

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
      appEnv.playStoreUrl,
      appEnv.appStoreUrl,
      appEnv.discordUrl,
      appEnv.sponsorsUrl,
    ]) {
      expect({ refused, present: text.includes(refused) }).toEqual({ refused, present: false });
    }
  });
});
