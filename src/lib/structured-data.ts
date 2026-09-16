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
 * description, the language it reads from the same i18next instance the site
 * head renders as `<html lang>`, the links from the env constants - so the
 * block cannot disagree with the visible page. No rich result is
 * expected, and no effect is: the block is kept because it is truthful,
 * costs nothing and parses clean (`docs/brand-result.md` § 6, #2405), so no
 * property here is ever justified by what a reader might do with it.
 *
 * The `WebSite` carries two more truths from that ruling (#2468):
 * `isAccessibleForFree`, which the landing states in words, and
 * `inLanguage`, which restates the document's `lang` - the visitor's
 * language after hydration, never a hardcoded "en" (`docs/indexability.md`
 * § 4.4). Both are valid on a `CreativeWork`, neither on an `Organization`.
 *
 * What is not here is each a ruling, not an omission: no `nonprofitStatus`
 * (no registered entity exists), no `founder` or `Person`, no `email` or
 * `contactPoint`, no store URLs, no rating, review or outcome claim, no
 * `alternateName` and no `SearchAction` (the site has no search); no
 * `knowsAbout`, `foundingDate`, `slogan`, `publishingPrinciples` or
 * `license`, because no page displays them, and no `BreadcrumbList`, because
 * flat routes leave no hierarchy to describe. `FAQPage` and
 * `SoftwareApplication` are refused on the record - no documented reader
 * acts on them and the site gains nothing truthful by asserting them.
 */

/** The block's media type. A data block, never JavaScript: the CSP does not see it. */
export const STRUCTURED_DATA_TYPE = "application/ld+json";

interface LandingStructuredDataInput {
  /** The landing page's canonical URL - the head's own `og:url`. */
  url: string;
  /** The description the head renders as the meta description. */
  description: string;
  /**
   * The document's language - `i18n.language`, the same read the site head
   * renders as `<html lang>`. English in the exported file, the visitor's
   * language after hydration; a literal here would be false in the DOM.
   */
  language: string;
}

/**
 * The graph, from the three strings the landing head already reads.
 * Serialise with `JSON.stringify` into the script's children.
 */
export function landingStructuredData({ url, description, language }: LandingStructuredDataInput) {
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
        // The landing renders "Free · Open source · Private" and "No ads, no
        // subscriptions"; free to users is a standing guardrail. On a WebSite
        // this asserts the site's content is free to access - narrower than
        // what the page says of the product, and the stronger claim would
        // need the refused `SoftwareApplication`.
        isAccessibleForFree: true,
        inLanguage: language,
      },
    ],
  };
}
