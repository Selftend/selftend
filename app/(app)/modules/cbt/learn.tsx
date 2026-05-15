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
import { BackButton } from "@/src/components/app/back-button";

export default function LearnScreen() {
  const { t } = useTranslation("cbt");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("learn.title")}</Text>
            </View>
            <Text variant="muted">{t("learn.description")}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("learn.useGently")}</CardTitle>
              <CardDescription>{t("learn.useGentlyDescription")}</CardDescription>
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
