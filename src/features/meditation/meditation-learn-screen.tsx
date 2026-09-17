import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";

import { MeditationFrameworkBody } from "./meditation-framework-body";

/**
 * The gated learn screen: this module's chrome around the framework body.
 *
 * The three cards moved to `meditation-framework-body.tsx` on #2469 so that
 * `app/meditation.tsx` can render the same three for a reader with no account
 * (docs/brand-result.md § 4). A **pure move** - this screen renders exactly what
 * it rendered before, and its test passes unedited. What stays here is what a
 * signed-in reader gets and a stranger does not: the safe area, the scroll
 * column, and the header block whose title is this screen's own instruction,
 * "Learn the framework". The public page takes the module's name instead
 * (§ 3.2's one named exception), which is why the title did not move either.
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
