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
import { ScreenHeader } from "@/src/components/app/screen-header";

interface ToolPlaceholderScreenProps {
  title: string;
  description: string;
}

export function ToolPlaceholderScreen({ title, description }: ToolPlaceholderScreenProps) {
  const { t } = useTranslation("common");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={title} />
            <Text variant="muted">{description}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("underConstruction")}</CardTitle>
              <CardDescription>{t("toolNotAvailable")}</CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
