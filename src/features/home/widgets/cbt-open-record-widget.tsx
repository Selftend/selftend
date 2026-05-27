import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";

export function CbtOpenRecordWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: records } = useThoughtRecords(userId);

  const active = (records ?? []).filter((r) => r.archivedAt === null);
  const sorted = [...active].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const unfinished = sorted.find((r) => r.balancedThought.trim() === "") ?? null;
  const latest = sorted[0] ?? null;
  const target = unfinished ?? latest;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="psychology" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtOpenRecord.title")}</Text>
        </View>
        {target ? (
          <Text variant="muted" className="text-xs" numberOfLines={2}>
            {target.situation || t("home.widgets.cbtOpenRecord.untitled")}
          </Text>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtOpenRecord.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push(target ? `/modules/cbt/${target.id}` : "/modules/cbt/new")}
        >
          <Text>
            {target
              ? unfinished
                ? t("home.widgets.cbtOpenRecord.continue")
                : t("home.widgets.cbtOpenRecord.reread")
              : t("home.widgets.cbtOpenRecord.start")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}
