import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MeditationFrameworkBody } from "@/src/features/meditation/meditation-framework-body";

/**
 * The gated learn screen, `/tools/meditation/learn`.
 *
 * Its three framework cards moved verbatim into `MeditationFrameworkBody` on
 * #2469 so the public `/meditation` explainer can render the same content behind
 * different chrome (docs/brand-result.md § 4). What is left here IS the chrome -
 * the safe area, the scrolling column, and the title block with this screen's
 * own in-app title, "Learn the framework".
 *
 * ☠️ That title is the one string the public page does NOT take: it is an
 * instruction to somebody already inside the module, it names no subject to a
 * stranger, and under the anchor-text rule it would become the footer label on
 * every public page. `/meditation` takes `module.home.title` instead - the
 * spec's one named exception (§ 3.2, Appendix A.18), still an existing app
 * string, so the pair of pages costs zero new i18n keys.
 *
 * ☠️ The extraction was a PURE move: this file's test passes unedited.
 */
export default function MeditationLearnScreen() {
  const { t } = useTranslation("meditation");
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("module.learn.title")} />
            <Text variant="muted">{t("module.learn.subtitle")}</Text>
          </View>

          <MeditationFrameworkBody />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
