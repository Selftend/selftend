import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

export function CrisisSupportCallout() {
  const { t } = useTranslation("common");
  // The callout's twin of the bar's jump (#1265, O3): `/crisis` is rooted at the
  // top, so its Up is Home, and a module home reached through it is exactly what
  // the user should be handed back.
  const pushWithOrigin = usePushWithOrigin();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("safety.title")}</CardTitle>
        <CardDescription>{t("safety.description")}</CardDescription>
      </CardHeader>
      <View className="px-6">
        <Button onPress={() => pushWithOrigin("/crisis")} variant="secondary">
          <Text>{t("safety.openCrisis")}</Text>
        </Button>
      </View>
    </Card>
  );
}
