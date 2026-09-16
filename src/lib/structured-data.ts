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
 * disagree with the visible page. No rich result is expected and no other
 * effect is either (`docs/brand-result.md` § 6, #2405): the block is kept
 * because it is truthful, free and parses clean, so the only test a property
 * passes here is whether the page says it.
 *
 * Two properties joined the `WebSite` on #2405 by that test alone:
 * `isAccessibleForFree`, because the landing renders "Free · Open source ·
 * Private" and "No ads, no subscriptions"; and `inLanguage`, which restates
 * the rendered `<html lang>` and so comes from the caller - never a fixed
 * "en", which would be false in the DOM for a Bulgarian-preference visitor
 * (`docs/indexability.md` § 4.4).
 *
 * What is not here is each a ruling, not an omission: no `nonprofitStatus`
 * (no registered entity exists), no `founder` or `Person`, no `email` or
 * `contactPoint`, no store URLs, no rating, review or outcome claim, no
 * `alternateName` and no `SearchAction` (the site has no search); no
 * `knowsAbout`, `foundingDate`, `slogan`, `publishingPrinciples` or `license`
 * (no page displays any of them), and no `BreadcrumbList` (flat routes leave
 * no hierarchy to describe). `FAQPage` and `SoftwareApplication` are refused
 * on the record because no documented reader acts on them and the site gains
 * nothing truthful by asserting them.
 */

/** The block's media type. A data block, never JavaScript: the CSP does not see it. */
export const STRUCTURED_DATA_TYPE = "application/ld+json";

interface LandingStructuredDataInput {
  /** The landing page's canonical URL - the head's own `og:url`. */
  url: string;
  /** The description the head renders as the meta description. */
  description: string;
  /**
   * The page's language - `i18n.language`, the value the root layout renders
   * as `<html lang>`. Passed in, like the address, so the block cannot say a
   * language the document does not.
   */
  inLanguage: string;
}

/**
 * The graph, from the three values the landing head already reads. Serialise
 * with `JSON.stringify` into the script's children.
 */
export function landingStructuredData({
  url,
  description,
  inLanguage,
}: LandingStructuredDataInput) {
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
        // Both restate the page, and only the page - see the docblock above.
        isAccessibleForFree: true,
        inLanguage,
      },
    ],
  };
}
