import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { WidgetCardHeader } from "@/src/features/home/widgets/widget-card-header";

export function ModuleShortcutWidget({ module }: { module: "cbt" | "act" }) {
  const { t } = useTranslation("navigation");
  const { t: tm } = useTranslation(module);
  const isCbt = module === "cbt";
  const route: Href = isCbt ? "/modules/cbt" : "/modules/act";

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pb-4 pt-4">
        <WidgetCardHeader
          icon={isCbt ? "psychology" : "explore"}
          title={t(`home.widgets.${module}ModuleShortcut.title`)}
          moduleLabel={tm("module.label")}
          tint={isCbt ? "primary" : "act"}
        />
        <Text variant="muted" className="text-xs" numberOfLines={3}>
          {t(`home.widgets.${module}ModuleShortcut.metaDesc`)}
        </Text>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push(route)}
        >
          <Text>{t(`home.widgets.${module}ModuleShortcut.cta`)}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
