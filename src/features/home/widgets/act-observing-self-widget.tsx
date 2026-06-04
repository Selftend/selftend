import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { WidgetCardHeader } from "@/src/features/home/widgets/widget-card-header";

export function ActObservingSelfWidget({ userId: _userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: ta } = useTranslation("act");

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <WidgetCardHeader
          icon="visibility"
          title={t("home.widgets.actObservingSelf.title")}
          moduleLabel={ta("module.label")}
          tint="act"
        />
        <Text variant="muted" className="text-xs">
          {t("home.widgets.actObservingSelf.prompt")}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/modules/act/observing-self")}
        >
          <Text className="text-muted-foreground">{t("home.widgets.actObservingSelf.cta")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}
