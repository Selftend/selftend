import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";

export function CompositePickupWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: records } = useThoughtRecords(userId);

  const draft =
    [...(records ?? [])]
      .filter((r) => r.archivedAt === null)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .find((r) => r.balancedThought.trim() === "") ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="play-arrow" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.compositePickup.title")}</Text>
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={2}>
          {draft
            ? draft.situation.trim() || t("home.widgets.compositePickup.record")
            : t("home.widgets.compositePickup.checkin")}
        </Text>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() =>
            router.push(draft ? `/modules/cbt/${draft.id}` : "/tools/mood-tracker/new")
          }
        >
          <Text>
            {draft
              ? t("home.widgets.compositePickup.recordCta")
              : t("home.widgets.compositePickup.checkinCta")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}
