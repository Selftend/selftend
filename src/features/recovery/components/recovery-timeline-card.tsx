import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatDate, getTimelineLabel, type TimelineItem } from "@/src/features/recovery/timeline";

interface RecoveryTimelineCardProps {
  items: TimelineItem[];
  lang: string;
}

/** Chronological timeline of recovery-relevant milestones. */
export function RecoveryTimelineCard({ items, lang }: RecoveryTimelineCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recovery.timeline.title")}</CardTitle>
        <CardDescription>{t("recovery.timeline.description")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <View key={`${item.key}-${item.date}`} className="flex-row gap-3">
              <View className="items-center">
                <View className="mt-1 size-3 rounded-full bg-primary" />
                <View className="w-px flex-1 bg-border" />
              </View>
              <View className="flex-1 gap-1 pb-4">
                <Text className="text-sm text-muted-foreground">{formatDate(item.date, lang)}</Text>
                <Text className="font-medium">{getTimelineLabel(t, item.key)}</Text>
                <Text variant="muted">{t("recovery.timeline.count", { count: item.count })}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text variant="muted">{t("recovery.timeline.empty")}</Text>
        )}
      </CardContent>
    </Card>
  );
}
