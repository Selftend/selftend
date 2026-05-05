import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export function CrisisSupportCallout() {
  const { t } = useTranslation("common");

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("safety.title")}</CardTitle>
        <CardDescription>{t("safety.description")}</CardDescription>
      </CardHeader>
      <View className="px-6">
        <Button onPress={() => router.push("/crisis")} variant="secondary">
          <Text>{t("safety.openCrisis")}</Text>
        </Button>
      </View>
    </Card>
  );
}
