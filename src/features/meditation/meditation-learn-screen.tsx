import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";

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

          {/* The attention card is the room's own material, so it converts to
              iris. The two below stay `be` and `act` - cross-module references
              to mindfulness and ACT, guests the room does not repaint. */}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
