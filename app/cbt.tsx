import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { LinkButton } from "@/src/components/app/link-button";
import { Text } from "@/src/components/react-native-reusables/text";
import { ThinkingPatternsBody } from "@/src/features/cbt/thinking-patterns-body";
import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";

/**
 * PROTOTYPE (#2404): the public renderer of the "Thinking patterns" explainer.
 *
 * A flat route at `app/cbt.tsx`, outside the `(app)` gate, because
 * `test/index-list.test.ts` allows a public route file no deeper than that.
 * It renders through `PolicyPageLayout` - the chrome every public page already
 * shares - so the per-route `<head>` (title through the template, description,
 * `og:*`, canonical) comes for free from the same two strings the page shows.
 *
 * No new copy: the H1 is `cbt:learn.title` unchanged (#2403 ruling 5) and the
 * subline is the learn screen's own description, which is already the lede
 * #2403 permits. The footer is the crisis route every public page carries
 * (#2403 ruling 6) and one quiet way into the app (ruling 2).
 */
export default function CbtScreen() {
  const { t } = useTranslation("cbt");
  const { t: tNavigation } = useTranslation("navigation");

  return (
    <PolicyPageLayout
      title={t("learn.title")}
      description={t("learn.description")}
      subtitle={t("learn.description")}
    >
      <ThinkingPatternsBody />

      <View className="gap-3 border-t border-border pt-6">
        <CrisisSupportBar />
        <LinkButton href="/" variant="link" size="sm" className="self-start">
          <Text className="text-xs">{tNavigation("home.widgets.launcher.signedOutCta")}</Text>
        </LinkButton>
      </View>
    </PolicyPageLayout>
  );
}
