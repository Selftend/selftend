import Head from "expo-router/head";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { SHARE_IMAGE_URL, SITE_NAME } from "@/src/lib/site";

/**
 * The web document's site-wide `<head>` defaults, rendered once from the root
 * layout (`docs/indexability.md` § 4.2, #2293).
 *
 * *Inherit only what names the site.* Everything here is true of every page:
 * the `og:` type, site name, share image and locale, and the card type. What
 * names a page - title, description, `og:title`, `og:description`, `og:url`,
 * canonical - is each screen's own `<Head>`; Helmet dedupes by name and
 * property, so a screen's tag replaces a default of the same name in the
 * exported file and in the DOM.
 *
 * `<html lang>` has exactly one owner, and it is this component (§ 4.4): the
 * exported file carries `en` (i18next's default in Node), and a visitor whose
 * preference is Bulgarian gets `bg` after hydration. `app/+html.tsx` sets no
 * `lang` for that reason.
 *
 * No title and no description here, since #2294: every public screen emits its
 * own through `RouteHead` (the landing through `LandingHead`), so a file that
 * inherited one would be a file naming the wrong page. The one translated
 * value below is the share image's alt.
 *
 * The share image is the 512 px app icon - the only share-sized image the
 * site serves - so the card is `summary`, not `summary_large_image`: a wide
 * card would letterbox a square icon. The image URL and the site name are
 * `site.ts` constants shared with the landing's structured data (§ 5), so
 * `Organization.logo` is `og:image` by construction. `twitter:title`,
 * `twitter:description` and `twitter:image` are gone: every unfurler falls
 * back to `og:*`.
 */
export function SiteHead() {
  const { t, i18n } = useTranslation("auth");

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <Head>
      <html lang={i18n.language} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={SHARE_IMAGE_URL} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:image:alt" content={t("landingPage.shareImageAlt")} />
      <meta property="og:locale" content="en_GB" />
      <meta name="twitter:card" content="summary" />
    </Head>
  );
}
