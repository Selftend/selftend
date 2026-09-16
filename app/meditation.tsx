import { useTranslation } from "react-i18next";

import { MeditationFrameworkBody } from "@/src/features/meditation/meditation-framework-body";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";

/**
 * `/meditation` - the first public explainer page (#2469, docs/brand-result.md
 * § 3-5).
 *
 * The principle it is the first instance of: **content the app already holds
 * may go public when it exists to explain a concept to someone who does not
 * know it yet; content a person operates - a form, a record, a log, a session -
 * stays behind the gate.** The meditation framework passes that test directly:
 * it would still exist with every search engine removed, and until now a person
 * had to create an account to read it. The sits, the logs and the stage
 * assessment do not, and none of them is here.
 *
 * ☠️ **The route file is FLAT, and that is a hard constraint, not a
 * preference.** `test/index-list.test.ts` asserts every route file outside
 * `(app)` and `(auth)` has depth two - a directory route would need a file-name
 * rule the index list does not have - so `app/learn/meditation.tsx` fails the
 * existing suite. Nothing was relaxed to let this page in. There is no
 * collision: the gated screens live under `/tools/meditation`.
 *
 * ☠️ **The title is `module.home.title` ("Meditation"), NOT the learn screen's
 * own `module.learn.title`** ("Learn the framework"). That is § 3.2's one named
 * exception, and it is legibility rather than keyword fit: inside the module the
 * instruction refers to something the reader has already met, while to a
 * stranger - in a search result, and as this page's label in the footer of every
 * other public page (§ 7.3) - it names no subject at all. Both are existing app
 * strings in both locales, so this page adds **zero i18n keys**.
 *
 * The head - title through the template key, description, `og:*`, canonical -
 * comes from `PolicyPageLayout`'s `RouteHead` off the two strings below, so
 * "document title = on-page H1" holds here without this file knowing anything
 * about `<head>`. There is **no structured-data block**: § 5 keeps `Organization`
 * and `WebSite` on `/` and nothing anywhere else.
 *
 * The page reads **no session** - nothing on it can be a spinner, and the
 * exported HTML holds the finished text rather than a loading state.
 */
export default function MeditationScreen() {
  const { t } = useTranslation("meditation");
  const subtitle = t("module.learn.subtitle");

  return (
    <PolicyPageLayout title={t("module.home.title")} description={subtitle} subtitle={subtitle}>
      <MeditationFrameworkBody />
    </PolicyPageLayout>
  );
}
