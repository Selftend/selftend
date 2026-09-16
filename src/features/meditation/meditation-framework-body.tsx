import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The meditation framework's three pieces of context - attention and peripheral
 * awareness, the gardener's mindset, the path is not linear - with **no chrome
 * at all**: no safe area, no scroll view, no header, no page title.
 *
 * Two screens render it (#2469, docs/brand-result.md § 4):
 *
 * - `meditation-learn-screen.tsx`, the gated `/tools/meditation/learn`, which
 *   wraps it in the app chrome it always had;
 * - `app/meditation.tsx`, the public explainer, which wraps it in
 *   `PolicyPageLayout` - the same chrome every policy page gets, footer included.
 *
 * ☠️ **The move out of the learn screen was PURE**, and that is the property the
 * ticket pinned: `meditation-learn-screen.test.tsx` passes UNEDITED. A red test
 * there means the move was not pure, not that the test needs updating.
 *
 * ☠️ It returns a **fragment, not a wrapping `View`**, and that is what makes the
 * move pure rather than merely equivalent. Both parents put their children in a
 * `<View className="gap-6">` beside the title block - the learn screen and
 * `PolicyPageLayout` have the same shape here - so the three cards stay direct
 * children of that column and inherit its gap. A wrapper would nest one gap-6
 * inside another: the same spacing today, and a second thing to keep in step.
 *
 * ☠️ **The two audiences needed no prop.** The obvious shape - a `variant` or a
 * `public` flag - had nothing to switch on, because everything that differs
 * between a signed-in reader and a stranger is chrome, and this component has
 * none. If the body ever genuinely has to differ, the difference arrives as a
 * REQUIRED prop, never a defaulted one, so both call sites have to answer it.
 *
 * ☠️ **`aria-level={2}` is load-bearing and pre-existing.** `CardTitle` defaults
 * to level 3, so a body that dropped these would render h1 → h3 with no h2 on
 * both pages - the exact shape `/security` shipped once (#2133). The public page
 * joins `policy-heading-outline.test.tsx`, which is the guard.
 *
 * The three cards keep the tints they had. The first is the meditation room's
 * own material and the two below are cross-module references (mindfulness and
 * ACT); #588 removed the module tints from all three, and the `border-border
 * bg-muted` pair on the lower two is what survived that ruling.
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
    </>
  );
}
