import Head from "expo-router/head";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

/**
 * The gated tree's document title: the site name, and nothing more (#2294).
 *
 * Every public screen names itself (`RouteHead`, `LandingHead`), every auth
 * screen names itself (`DocumentTitle`), and the root layout carries no title
 * at all - a title inherited by a public file would be a file naming the
 * wrong page. The signed-in `(app)` screens are the one tree that carries
 * none of its own yet: per-screen titles there are deferred by
 * `docs/indexability.md` § 11, and without this a signed-in tab would read
 * as its bare URL. So the `(app)` layout carries the site name, as the old
 * shell did, and a screen that later adopts a `DocumentTitle` wins over it -
 * Helmet lets the deepest `<Head>` speak.
 *
 * Nothing on native, for the same reason as `DocumentTitle`.
 */
export function SiteDocumentTitle() {
  const { t } = useTranslation("navigation");

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <Head>
      <title>{t("header.appName")}</title>
    </Head>
  );
}
