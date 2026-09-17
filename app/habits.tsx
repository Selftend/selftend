import { useTranslation } from "react-i18next";

import { HabitsLearnCardsBody } from "@/src/features/habits/habits-learn-cards-body";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";

/**
 * `/habits` - the second public explainer page (#2470, docs/brand-result.md
 * § 3-5), and the last of the two the module gate does not reach (§ 3.3): the
 * three module explainers land with their modules' return, never before.
 *
 * The principle it is the second instance of: **content the app already holds
 * may go public when it exists to explain a concept to someone who does not
 * know it yet; content a person operates - a form, a record, a log, a session -
 * stays behind the gate.** Habit formation passes that test directly - the ten
 * ideas would still exist with every search engine removed - while a habit, its
 * schedule and its logs do not, and none of them is here.
 *
 * ☠️ **The route file is FLAT, and that is a hard constraint, not a
 * preference.** `test/index-list.test.ts` asserts every route file outside
 * `(app)` and `(auth)` has depth two, so `app/learn/habits.tsx` fails the
 * existing suite. Nothing was relaxed to let this page in. There is no
 * collision: the gated screens live under `/tools/habits`.
 *
 * ☠️ **The title is `learn.indexTitle`, and `habits:learn.title` does not
 * exist** (#2403 recorded the source as `learn.cards`). "Habit building - core
 * ideas" carries its own hyphen, so the composed document title reads with two -
 * **accepted** rather than smoothed, because the rule is the existing string
 * unchanged (§ 5). This page adds **zero i18n keys**; both strings are already
 * in `en` and `bg`.
 *
 * The body carries the articles rather than the gated index's ten links - see
 * `habits-learn-cards-body.tsx` for why that is a required prop and not a
 * default.
 *
 * The head - title through the template key, description, `og:*`, canonical -
 * comes from `PolicyPageLayout`'s `RouteHead` off the two strings below, so
 * "document title = on-page H1" holds here without this file knowing anything
 * about `<head>`. There is **no structured-data block**: § 5 keeps
 * `Organization` and `WebSite` on `/` and nothing anywhere else.
 *
 * The page reads **no session** - nothing on it can be a spinner, and the
 * exported HTML holds the finished text rather than a loading state.
 */
export default function HabitsScreen() {
  const { t } = useTranslation("habits");
  const subtitle = t("learn.indexSubtitle");

  return (
    <PolicyPageLayout title={t("learn.indexTitle")} description={subtitle} subtitle={subtitle}>
      <HabitsLearnCardsBody presentation="articles" />
    </PolicyPageLayout>
  );
}
