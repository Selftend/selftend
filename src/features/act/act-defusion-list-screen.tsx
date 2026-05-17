import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { useDefusionLogs } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

export default function ActDefusionListScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { data: logs, isLoading } = useDefusionLogs(user?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t("defusion.listTitle")} />
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
              <Text variant="h1">{t("defusion.listTitle")}</Text>
            </View>
            <Text variant="muted">{t("defusion.listSubtitle")}</Text>
          </View>

          <Button
            onPress={() =>
              router.push("/modules/act/defusion/new" as Parameters<typeof router.push>[0])
            }
          >
            <Icon name="add" className="size-4 text-primary-foreground" />
            <Text>{t("home.defuseThought")}</Text>
          </Button>

          {!logs || logs.length === 0 ? (
            <Text variant="muted">{t("defusion.noLogs")}</Text>
          ) : (
            <View className="gap-2">
              {logs.map((log) => (
                <Pressable
                  key={log.id}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/modules/act/defusion/[id]",
                      params: { id: log.id },
                    } as Parameters<typeof router.push>[0])
                  }
                  className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold leading-snug" numberOfLines={2}>
                        {log.fusedThought}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t(`defusion.categories.${log.thoughtCategory}`)}
                        {" · "}
                        {t(`defusion.techniques.${log.techniqueUsed}`)}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {log.fusionLevelBefore !== null && log.fusionLevelAfter !== null ? (
                      <View className="items-end gap-1">
                        <Text className="text-sm font-bold text-act">
                          {log.fusionLevelBefore} → {log.fusionLevelAfter}
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
