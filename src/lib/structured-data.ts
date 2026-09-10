import { appEnv } from "@/src/lib/env";
import { SHARE_IMAGE_URL, SITE_NAME } from "@/src/lib/site";

/**
 * The landing page's structured data (`docs/indexability.md` § 5, #2296).
 *
 * One schema.org graph of two nodes, decided on #2291: an `Organization`
 * that says who publishes the site, and a `WebSite` that says what the site
 * is called and points at the publisher by `@id`. The strings are the ones
 * the page already shows - the site name and share image from `site.ts`, the
 * address and description the caller reads for its own `og:url` and meta
 * description, the links from the env constants - so the block cannot
 * disagree with the visible page. No rich result is expected; the win is the
 * logo and site-name association in Google and Bing.
 *
 * What is not here is each a ruling, not an omission: no `nonprofitStatus`
 * (no registered entity exists), no `founder` or `Person`, no `email` or
 * `contactPoint`, no store URLs, no rating, review or outcome claim, no
 * `alternateName` and no `SearchAction` (the site has no search). `FAQPage`
 * and `SoftwareApplication` are refused on the record - Google withdrew the
 * FAQ rich result in 2026, and a software rich result requires a rating or
 * review the product may not invent.
 */

/** The block's media type. A data block, never JavaScript: the CSP does not see it. */
export const STRUCTURED_DATA_TYPE = "application/ld+json";

interface LandingStructuredDataInput {
  /** The landing page's canonical URL - the head's own `og:url`. */
  url: string;
  /** The description the head renders as the meta description. */
  description: string;
}

/**
 * The graph, from the two strings the landing head already reads. Serialise
 * with `JSON.stringify` into the script's children.
 */
export function landingStructuredData({ url, description }: LandingStructuredDataInput) {
  const organizationId = `${url}#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url,
        logo: SHARE_IMAGE_URL,
        description,
        // A fork blanks a link with an empty env value, as the footer and the
        // user menu already honour; an empty `sameAs` entry is a validator error.
        sameAs: [appEnv.githubRepoUrl, appEnv.redditUrl, appEnv.youtubeUrl].filter(Boolean),
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url,
        publisher: { "@id": organizationId },
      },
    ],
  };
}
