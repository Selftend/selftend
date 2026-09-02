import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionDefinitions } from "@/src/constants/distortions";
import { ScreenHeader } from "@/src/components/app/screen-header";

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

          <Card>
            <CardHeader>
              <CardTitle>{t("learn.useGently")}</CardTitle>
              <CardDescription>{t("learn.useGentlyDescription")}</CardDescription>
            </CardHeader>
          </Card>

          {/*
           * Pace and mode, in the framework's voice: the one place the over-use
           * answer is taught, static by ruling, with the professional door as the
           * last sentence and nothing behind it. Why static, and why here:
           * ADR-0004 § "The over-use obligation" (#1659 → #1671).
           */}
          <Card>
            <CardHeader>
              <CardTitle>{t("learn.pacing.title")}</CardTitle>
              <CardDescription>{t("learn.pacing.rhythm")}</CardDescription>
              <CardDescription>{t("learn.pacing.mode")}</CardDescription>
              <CardDescription>{t("learn.pacing.signs")}</CardDescription>
            </CardHeader>
          </Card>

          {distortionDefinitions.map((distortion) => (
            <Card key={distortion.key}>
              <CardHeader>
                <CardTitle>{t(`distortions.${distortion.key}.title`)}</CardTitle>
                <CardDescription>
                  {t(`distortions.${distortion.key}.shortDescription`)}{" "}
                  {t(`distortions.${distortion.key}.reflectionPrompt`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
