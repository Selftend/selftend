import Head from "expo-router/head";
import { usePathname } from "expo-router";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { canonicalUrl } from "@/src/lib/site";

interface RouteHeadProps {
  /** The page's H1, exactly as rendered - the template adds the site name. */
  title: string;
  /** The page's on-page subline, verbatim - one source, no drift. */
  description: string;
}

/**
 * A public route's own `<head>` (`docs/indexability.md` § 4.1, § 4.3, #2294).
 *
 * *Own what names the page.* Title, description, `og:title`, `og:description`,
 * `og:url` and the canonical, from two strings plus the path: the H1 through
 * the one template, the subline verbatim, and the apex origin joined to the
 * route the router is on. `PolicyPageLayout` renders this from the props it
 * already receives, so no route file can forget it and "document title =
 * on-page H1" is structural. The root layout's `SiteHead` carries only what
 * names the site; Helmet dedupes by name and property, so each exported file
 * carries exactly one of each tag.
 *
 * English in the exported file (i18next's default in Node), the visitor's
 * language after hydration - the same rule as `<html lang>`.
 */
export function RouteHead({ title, description }: RouteHeadProps) {
  const { t } = useTranslation("common");
  const pathname = usePathname();

  if (Platform.OS !== "web") {
    return null;
  }

  const documentTitle = t("documentTitle", { page: title });
  const url = canonicalUrl(pathname);

  return (
    <Head>
      <title>{documentTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={documentTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <link rel="canonical" href={url} />
    </Head>
  );
}
