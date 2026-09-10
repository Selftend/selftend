import Head from "expo-router/head";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

interface DocumentTitleProps {
  /** The screen's H1, exactly as rendered - the template adds the site name. */
  page: string;
  /**
   * `+not-found` only: the one route-shaped file that is not a route. Every
   * other file on production is indexable by existing (`docs/indexability.md`
   * § 3), so nothing else may pass this.
   */
  noindex?: boolean;
}

/**
 * The web document title, from the screen's H1 through the one template
 * (`common:documentTitle`, "{{page}} - Selftend"; `docs/indexability.md`
 * § 4.1, § 4.5, #2294).
 *
 * Rendered BESIDE the H1 it names, so a state-dependent heading - the
 * callback's four states, the expired reset link, the conversion variant of
 * sign-up - carries its own title with it and the two cannot drift. On the
 * screens that also export a file, `RouteHead` owns the full head and this is
 * not used; here it is the tab title, the history entry and the screen-reader
 * document title for a screen search never sees.
 *
 * Nothing on native: expo-router's `Head` is a real feature there (handoff,
 * universal links) that no screen has adopted yet, and a title alone would be
 * a half-adoption.
 */
export function DocumentTitle({ page, noindex = false }: DocumentTitleProps) {
  const { t } = useTranslation("common");

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <Head>
      <title>{t("documentTitle", { page })}</title>
      {noindex ? <meta name="robots" content="noindex" /> : null}
    </Head>
  );
}
