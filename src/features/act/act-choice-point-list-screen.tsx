import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { useChoicePoints } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function ActChoicePointListScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data: choicePoints, isLoading } = useChoicePoints(user?.id ?? null);

  if (isLoading) {
    return <ScreenLoading title={t("choicePoint.listTitle")} />;
  }

  const dayChoicePoints = (choicePoints ?? []).filter(
    (cp) => toLocalDateKey(cp.createdAt) === selectedDate,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("choicePoint.listTitle")}</Text>
            </View>
            <Text variant="muted">{t("choicePoint.primer")}</Text>
          </View>

          <Button onPress={() => router.push("/modules/act/choice-point/new")}>
            <Icon name="add" className="size-4 text-primary-foreground" />
            <Text>{t("choicePoint.newCta")}</Text>
          </Button>

          {dayChoicePoints.length === 0 ? (
            <Text variant="muted">{t("choicePoint.empty")}</Text>
          ) : (
            <View className="gap-2">
              {dayChoicePoints.map((cp) => (
                <Pressable
                  key={cp.id}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/modules/act/choice-point/[id]",
                      params: { id: cp.id },
                    })
                  }
                  className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      {cp.hooks.length > 0 ? (
                        <Text className="font-semibold leading-snug" numberOfLines={2}>
                          {cp.hooks.join(", ")}
                        </Text>
                      ) : null}
                      <Text variant="muted" className="text-xs">
                        {t("choicePoint.towardLabel")}: {cp.towardMoves.length}
                        {" · "}
                        {t("choicePoint.awayLabel")}: {cp.awayMoves.length}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(cp.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Icon name="chevron-right" className="size-4 text-muted-foreground" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
