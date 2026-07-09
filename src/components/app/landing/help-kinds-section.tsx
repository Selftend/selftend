import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * "Two kinds of help" landing section: explains modules vs. tools in plain
 * language. The two cards are deliberately equal weight (same size, same
 * card chrome, no tint accents) — the parity itself is the message: this
 * is two doors in, not a primary path with a secondary footnote.
 */
export function HelpKindsSection() {
  const { t } = useTranslation("auth");

  return (
    <View className="gap-6 sm:gap-8">
      <Text variant="h2" className="text-center text-2xl sm:text-3xl">
        {t("landingPage.helpTitle")}
      </Text>
      <View className="flex-col items-stretch gap-4 sm:flex-row sm:gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">{t("landingPage.modulesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text variant="muted" className="leading-[1.55]">
              {t("landingPage.modulesBody")}
            </Text>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">{t("landingPage.toolsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text variant="muted" className="leading-[1.55]">
              {t("landingPage.toolsBody")}
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
