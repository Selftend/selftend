import { useTranslation } from "react-i18next";

import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import { MeditationFrameworkBody } from "@/src/features/meditation/meditation-framework-body";

/**
 * `/meditation` - **the first public explainer page** (#2469,
 * docs/brand-result.md § 3-5).
 *
 * The principle it is the first instance of, which outlives the page: *content
 * the app already holds may go public when it exists to **explain a concept to
 * someone who does not know it yet**; content a person **operates** - a form, a
 * record, a log, a session - stays behind the gate.* The framework is an
 * explanation, so a stranger can read what meditation practice actually involves
 * without creating an account; the sessions, the timer and the stage records
 * stay where they are.
 *
 * **One body, two renderers.** `MeditationFrameworkBody` is the whole content,
 * shared verbatim with the gated `/tools/meditation/learn`. The two audiences
 * differ in CHROME only, which is why the body takes no prop: this file wraps it
 * in `PolicyPageLayout`, the same chrome the seven policy pages get - the
 * `HOME_COLUMN` width, the Escape, the `RouteHead`, and the `SiteFooter` that
 * puts crisis guidance and every other public page one click away.
 *
 * ☠️ **The route file is FLAT, and that is a rule rather than a preference.**
 * `test/index-list.test.ts` asserts every route file outside `(app)` and
 * `(auth)` has depth two - _"a directory route would need a file-name rule the
 * list does not have"_ - so `app/learn/meditation.tsx` would fail the existing
 * suite. Nothing was relaxed to land this page. There is no collision either:
 * the gated screen is `/tools/meditation`, inside the group.
 *
 * ☠️ **The title is `module.home.title`, not the learn screen's own title.**
 * `module.learn.title` is "Learn the framework" - an instruction to somebody
 * already inside the module, naming no subject to a stranger, and under the
 * anchor-text rule (§ 7.3) it would be the footer label on every public page.
 * This is the spec's ONE named exception to "the title is whatever the app
 * already calls it" (§ 3.2, Appendix A.18), and it is legibility, never keyword
 * fit: both strings are existing app strings, so the page costs zero new i18n
 * keys in either locale.
 *
 * **No structured-data block** (§ 6): the landing keeps the only one, and
 * `test/structured-data-surface.test.ts` - the source-grepping gate that
 * hardcodes the two files allowed to name the type - stays unedited.
 *
 * **Nothing here can be a spinner.** The page reads no session and no server
 * state, so there is no pending surface to reserve space for (ADR-0009 has no
 * object here) and the exported HTML holds the finished text.
 */
export default function MeditationScreen() {
  const { t } = useTranslation("meditation");
  const description = t("module.learn.subtitle");

  return (
    <PolicyPageLayout
      title={t("module.home.title")}
      description={description}
      subtitle={description}
    >
      <MeditationFrameworkBody />
    </PolicyPageLayout>
  );
}
