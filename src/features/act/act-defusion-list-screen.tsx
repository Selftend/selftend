import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { DefusionLogRow } from "@/src/features/act/defusion-log-row";
import { useDefusionLogs } from "@/src/features/act/queries";
import { RelatedTools } from "@/src/features/act/related-tools";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function ActDefusionListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data: logs, isLoading } = useDefusionLogs(user?.id ?? null);

  if (isLoading) {
    return <ScreenLoading title={t("defusion.listTitle")} />;
  }

  const dayLogs = (logs ?? []).filter((log) => toLocalDateKey(log.createdAt) === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("defusion.listTitle")} />
            <Text variant="muted">{t("defusion.listSubtitle")}</Text>
          </View>

          <Button onPress={() => pushWithOrigin("/modules/act/defusion/new")}>
            <Icon name="add" className="size-4 text-primary-foreground" />
            <Text>{t("defusion.newTitle")}</Text>
          </Button>

          <RelatedTools
            tools={[{ icon: "edit-note", nameKey: "journal", href: "/tools/journal" }]}
          />

          {dayLogs.length === 0 ? (
            <Text variant="muted">{t("defusion.noLogs")}</Text>
          ) : (
            <View>
              {dayLogs.map((log) => (
                <DefusionLogRow
                  key={log.id}
                  log={log}
                  onPress={() =>
                    pushWithOrigin({
                      pathname: "/modules/act/defusion/[id]",
                      params: { id: log.id },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
