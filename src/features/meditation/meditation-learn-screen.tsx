import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";

export default function MeditationLearnScreen() {
  const { t } = useTranslation("meditation");
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("module.learn.title")}</Text>
            </View>
            <Text variant="muted">{t("module.learn.subtitle")}</Text>
          </View>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.learn.attentionTitle")}</CardTitle>
              <Text variant="muted">{t("module.learn.attentionBody")}</Text>
            </CardContent>
          </Card>

          <Card className="border-be/30 bg-be/5">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.learn.gardenerTitle")}</CardTitle>
              <Text variant="muted">{t("module.learn.gardenerBody")}</Text>
            </CardContent>
          </Card>

          <Card className="border-act/30 bg-act/5">
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.learn.nonLinearTitle")}</CardTitle>
              <Text variant="muted">{t("module.learn.nonLinearBody")}</Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
