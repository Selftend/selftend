import { Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";

export default function NotFoundScreen() {
  const { t } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text variant="h1">{t("notFound.title")}</Text>
        <Link href="/" replace>
          <Text>{t("notFound.home")}</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
