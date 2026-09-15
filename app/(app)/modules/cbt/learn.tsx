import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ThinkingPatternsBody } from "@/src/features/cbt/thinking-patterns-body";

/**
 * PROTOTYPE (#2404): the gated renderer of the "Thinking patterns" explainer.
 * The chrome is exactly what this screen rendered before; the cards moved to
 * `ThinkingPatternsBody`, which the public `/cbt` page renders too.
 */
export default function LearnScreen() {
  const { t } = useTranslation("cbt");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("learn.title")} />
            <Text variant="muted">{t("learn.description")}</Text>
          </View>

          <ThinkingPatternsBody />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
