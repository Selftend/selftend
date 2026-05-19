import { router, type Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import type { CarePlanItem } from "@/src/features/plan/types";

const TOOL_ICONS: Record<string, string> = {
  mood: "mood",
  cbt: "article",
  breathing: "air",
  meditation: "self-improvement",
  gratitude: "favorite",
  journal: "edit-note",
  habits: "directions-run",
  "self-care": "spa",
};

interface GenericWidgetProps {
  userId: string;
  item: CarePlanItem;
}

export function GenericWidget({ item }: GenericWidgetProps) {
  const { t } = useTranslation("navigation");
  const icon = (TOOL_ICONS[item.toolId] ?? "check-circle") as Parameters<typeof Icon>[0]["name"];

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name={icon} className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{item.title}</Text>
        </View>
        <Button
          onPress={() => router.push(item.route as Href)}
          size="sm"
          variant="outline"
          className="self-start"
        >
          <Text>{t("today.plan.open")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
