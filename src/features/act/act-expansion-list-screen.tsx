import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { useExpansionLogs } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

export default function ActExpansionListScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { data: logs, isLoading } = useExpansionLogs(user?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t("expansion.listTitle")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("expansion.listTitle")}</Text>
            </View>
            <Text variant="muted">{t("expansion.listSubtitle")}</Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="min-w-[160px] flex-1 basis-[160px]">
              <Button
                onPress={() =>
                  router.push("/modules/act/expansion/new" as Parameters<typeof router.push>[0])
                }
              >
                <Icon name="open-in-full" className="size-4 text-primary-foreground" />
                <Text>{t("expansion.newTitle")}</Text>
              </Button>
            </View>
            <View className="min-w-[160px] flex-1 basis-[160px]">
              <Button
                variant="secondary"
                onPress={() =>
                  router.push(
                    "/modules/act/expansion/urge-surfing" as Parameters<typeof router.push>[0],
                  )
                }
              >
                <Icon name="waves" className="size-4" />
                <Text>{t("expansion.urgeSurfTitle")}</Text>
              </Button>
            </View>
          </View>

          {!logs || logs.length === 0 ? (
            <Text variant="muted">{t("expansion.noLogs")}</Text>
          ) : (
            <View className="gap-2">
              {logs.map((log) => (
                <Pressable
                  key={log.id}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/modules/act/expansion/[id]",
                      params: { id: log.id },
                    } as Parameters<typeof router.push>[0])
                  }
                  className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold leading-snug" numberOfLines={2}>
                        {log.emotion}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t(`expansion.techniques.${log.techniqueUsed}`)}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {log.intensityBefore !== null && log.intensityAfter !== null ? (
                      <View className="items-end gap-1">
                        <Text className="text-sm font-bold text-act">
                          {log.intensityBefore} → {log.intensityAfter}
                        </Text>
                      </View>
                    ) : null}
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
