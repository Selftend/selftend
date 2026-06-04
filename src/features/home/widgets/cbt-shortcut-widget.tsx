import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { WidgetCardHeader } from "@/src/features/home/widgets/widget-card-header";

export function CbtShortcutWidget({
  icon,
  title,
  description,
  cta,
  route,
}: {
  icon: MaterialIconName;
  title: string;
  description: string;
  cta: string;
  route: Href;
}) {
  const { t } = useTranslation("cbt");
  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <WidgetCardHeader
          icon={icon}
          title={title}
          moduleLabel={t("module.label")}
          tint="primary"
        />
        <Text variant="muted" className="text-xs" numberOfLines={2}>
          {description}
        </Text>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push(route)}
        >
          <Text>{cta}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
