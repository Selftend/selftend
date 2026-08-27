import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { ACT_SHARED_TOOLS } from "@/src/features/act/act-shared-tools";
import { useConnectionLogs } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { useLocaleFormats } from "@/src/lib/locale-format";

export default function ActConnectionListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("act");
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data: logs, isLoading } = useConnectionLogs(user?.id ?? null);

  if (isLoading) {
    return <ScreenLoading title={t("connection.listTitle")} />;
  }

  const dayLogs = (logs ?? []).filter((log) => toLocalDateKey(log.createdAt) === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("connection.listTitle")} />
            <Text variant="muted">{t("connection.listSubtitle")}</Text>
          </View>

          <Button onPress={() => pushWithOrigin("/modules/act/connection/new")}>
            <Icon name="radio-button-checked" className="size-4 text-primary-foreground" />
            <Text>{t("connection.newTitle")}</Text>
          </Button>

          <SharedToolsRow
            heading={t("alsoTry")}
            tools={[ACT_SHARED_TOOLS.meditation, ACT_SHARED_TOOLS.grounding]}
          />

          {dayLogs.length === 0 ? (
            <Text variant="muted">{t("connection.noLogs")}</Text>
          ) : (
            <View className="gap-2">
              {dayLogs.map((log) => (
                <Pressable
                  key={log.id}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    pushWithOrigin({
                      pathname: "/modules/act/connection/[id]",
                      params: { id: log.id },
                    })
                  }
                  className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold leading-snug" numberOfLines={2}>
                        {log.noticesFromSenses || t(`connection.techniques.${log.technique}`)}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t(`connection.techniques.${log.technique}`)}
                        {log.moodAfter !== null ? `  ·  ${log.moodAfter}/10` : null}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {formatDateTime(log.createdAt)}
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
