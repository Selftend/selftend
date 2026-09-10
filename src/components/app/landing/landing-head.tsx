import Head from "expo-router/head";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { canonicalUrl } from "@/src/lib/site";

/**
 * The landing page's own `<head>` (`docs/indexability.md` § 4.1, #2293).
 *
 * *Own what names the page.* Title, description, `og:title`, `og:description`,
 * `og:url` and the canonical all come from two strings plus the path: the
 * decided short form as the title, today's frame description as the
 * description, and the apex root as the address. Helmet dedupes by name and
 * property against the root layout's `SiteHead`, so `dist/index.html` carries
 * exactly one of each.
 *
 * `auth:landingPage.metaTitle` and `metaDescription` are the old
 * `public/index.html` literals, moved into the namespace so the copy gate
 * reads them beside the on-page hero copy. English in the exported file,
 * the visitor's language after hydration.
 */
export function LandingHead() {
  const { t } = useTranslation("auth");

  if (Platform.OS !== "web") {
    return null;
  }

  const title = t("landingPage.metaTitle");
  const description = t("landingPage.metaDescription");
  const url = canonicalUrl("/");

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <link rel="canonical" href={url} />
    </Head>
  );
}
