import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Text } from "@/src/components/react-native-reusables/text";
import { GratitudeBreakScreen } from "@/src/features/gratitude/gratitude-break-screen";
import { getBreakBySlug } from "@/src/features/gratitude/breaks";

export default function GratitudeBreakRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation("gratitude");
  const breakDef = getBreakBySlug(typeof slug === "string" ? slug : "");

  if (!breakDef) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <View className="p-6 gap-6">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
          </View>
          <Text variant="muted">{t("detail.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <GratitudeBreakScreen breakDef={breakDef} />;
}
