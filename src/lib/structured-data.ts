import { appEnv } from "@/src/lib/env";
import { SHARE_IMAGE_URL, SITE_NAME, canonicalUrl } from "@/src/lib/site";

/**
 * The landing page's structured data (`docs/indexability.md` § 5, #2296).
 *
 * One schema.org graph of two nodes, decided on #2291: an `Organization`
 * that says who publishes the site, and a `WebSite` that says what the site
 * is called and points at the publisher by `@id`. The strings are the ones
 * the page already shows - the site name and share image from `site.ts`, the
 * description the caller reads from the same key as the meta description, the
 * links from the env constants - so the block cannot disagree with the
 * visible page. No rich result is expected; the win is the logo and site-name
 * association in Google and Bing.
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

const SITE_URL = canonicalUrl("/");
const ORGANIZATION_ID = `${SITE_URL}#organization`;
const WEBSITE_ID = `${SITE_URL}#website`;

/**
 * The graph, from the description the landing head renders as the meta
 * description. Serialise with `JSON.stringify` into the script's children.
 */
export function landingStructuredData(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: SHARE_IMAGE_URL,
        description,
        // A fork may blank a link; an empty `sameAs` entry is a validator error.
        sameAs: [appEnv.githubRepoUrl, appEnv.redditUrl, appEnv.youtubeUrl].filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}
