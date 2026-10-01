import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The meditation framework's three pieces of context - attention and peripheral
 * awareness, the gardener's mindset, the path is not linear - with no chrome of
 * any kind (#2469, docs/brand-result.md § 4), closed by the source line that
 * names the framework's book (#2860).
 *
 * **One body, two renderers.** `meditation-learn-screen.tsx` renders it inside
 * the gated screen's safe area, scroll column and header; `app/meditation.tsx`
 * renders it inside `PolicyPageLayout` for a reader with no account. The two
 * audiences differ in CHROME, and this file has none - so the two-audiences
 * problem needs **no prop at all**, and there is no `isPublic` flag to get
 * wrong. If the body ever has to differ for one of them, the difference is a
 * required prop, never a default.
 *
 * ☠️ **The move out of the learn screen was pure**: the cards below are that
 * screen's cards verbatim, and `meditation-learn-screen.test.tsx` passes
 * UNEDITED. A red test there does not mean the test needs updating - it means
 * the move was not pure.
 *
 * ☠️ **`aria-level={2}` is load-bearing and is not decoration.** `CardTitle`
 * defaults to level 3, so a body rendered under a layout's h1 would produce
 * h1 → h3 with no h2 - the WCAG 1.3.1 / 2.4.6 defect `/security` shipped once
 * before (#2133). `policy-heading-outline.test.tsx` renders the public page
 * beside `/security` and `/privacy` to hold the level here.
 *
 * The first card carries no fill and the two below carry `border-border
 * bg-muted`; that is all that distinguishes them. The module tints this trio
 * used to wear were removed on #588 - a card's colour no longer says which
 * module it belongs to - and the learn screen's test pins their absence.
 */
export function MeditationFrameworkBody() {
  const { t } = useTranslation("meditation");

  return (
    <>
      <Card>
        <CardContent className="gap-2 pt-6">
          <CardTitle aria-level={2}>{t("module.learn.attentionTitle")}</CardTitle>
          <Text variant="muted">{t("module.learn.attentionBody")}</Text>
        </CardContent>
      </Card>

      <Card className="border-border bg-muted">
        <CardContent className="gap-2 pt-6">
          <CardTitle aria-level={2}>{t("module.learn.gardenerTitle")}</CardTitle>
          <Text variant="muted">{t("module.learn.gardenerBody")}</Text>
        </CardContent>
      </Card>

      <Card className="border-border bg-muted">
        <CardContent className="gap-2 pt-6">
          <CardTitle aria-level={2}>{t("module.learn.nonLinearTitle")}</CardTitle>
          <Text variant="muted">{t("module.learn.nonLinearBody")}</Text>
        </CardContent>
      </Card>

      <MeditationSourceLine />
    </>
  );
}

/**
 * The line that names where the module's framework comes from (#2860): the ten
 * stages and their names, the four milestones, the attention / peripheral
 * awareness distinction and the stage self-assessment are Culadasa (John
 * Yates)'s *The Mind Illuminated* - and a module teaching that taxonomy without
 * naming it presents it as house material, which is both a close-paraphrase
 * exposure and the opposite of "describe it as an idea or pattern, not as
 * original invention" (AGENTS.md). Same remedy as the habits modules' Atomic
 * Habits line (#2807 → `HabitsLearnSourceLine`).
 *
 * It renders at the end of this shared body, so the gated learn screen and the
 * public `/meditation` page carry it by construction - and it is exported so
 * the module's other surfaces (the home overview, the stages spine) render the
 * SAME component and the same key, rather than wording that can drift.
 */
export function MeditationSourceLine() {
  const { t } = useTranslation("meditation");

  return (
    <Text variant="muted" className="text-sm">
      {t("sourceLine")}
    </Text>
  );
}
