import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";

const SKILL_KEYS = [
  "mindfulness",
  "distressTolerance",
  "emotionRegulation",
  "interpersonal",
] as const;

export default function DbtModuleScreen() {
  const { t } = useTranslation("modules");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("dbt.eyebrow")}
            </Text>
            <ScreenHeader title={t("dbt.title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("dbt.description")}
            </Text>
          </View>

          <Card className="border-be/30 bg-be/5">
            <CardHeader className="flex-row items-center gap-4">
              <View className="size-14 items-center justify-center rounded-xl border border-be/30 bg-be/15">
                <Icon name="anchor" className="size-7 text-be" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold">{t("dbt.statusTitle")}</Text>
                <Text variant="muted" className="text-sm leading-5">
                  {t("dbt.statusBody")}
                </Text>
              </View>
            </CardHeader>
          </Card>

          <View className="gap-3">
            <Text variant="h3">{t("dbt.skillsTitle")}</Text>
            <View className="mt-2 flex-row flex-wrap gap-3">
              {SKILL_KEYS.map((key) => (
                <View key={key} className="min-w-[260px] flex-1 basis-[260px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t(`dbt.skills.${key}.name`)}</CardTitle>
                      <CardDescription>{t(`dbt.skills.${key}.desc`)}</CardDescription>
                    </CardHeader>
                  </Card>
                </View>
              ))}
            </View>
          </View>

          <CrisisSupportCallout />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
