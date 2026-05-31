import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { currentDateKey } from "@/src/stores/selected-date-store";

export function CbtBeliefsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data } = useCoreBeliefs(userId);
  const beliefs = data ?? [];
  // nextReviewDate is a civil date (YYYY-MM-DD); compare against today's LOCAL date key
  // — not a full UTC ISO instant, which lexicographically mismatches the date-only value.
  const today = currentDateKey();
  const due = beliefs
    .filter((b) => b.nextReviewDate !== null && b.nextReviewDate <= today)
    .sort((a, b) => (a.nextReviewDate! < b.nextReviewDate! ? -1 : 1));
  const target =
    due[0] ?? [...beliefs].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="anchor" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtBeliefs.title")}</Text>
        </View>
        {target ? (
          <>
            <Text variant="muted" className="text-xs">
              {due.length > 0
                ? t("home.widgets.cbtBeliefs.due", { count: due.length })
                : t("home.widgets.cbtBeliefs.stat", { count: beliefs.length })}
            </Text>
            <Text className="text-xs" numberOfLines={2}>
              {target.beliefStatement}
            </Text>
          </>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtBeliefs.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() =>
            router.push(target ? `/modules/cbt/beliefs/${target.id}` : "/modules/cbt/beliefs/new")
          }
        >
          <Text>
            {target ? t("home.widgets.cbtBeliefs.review") : t("home.widgets.cbtBeliefs.start")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}
