import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { LoadingState } from "@/src/components/app/screen-state";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useSession } from "@/src/providers/session-provider";
import { BackButton } from "@/src/components/app/back-button";
import { HelpButton } from "@/src/components/app/help-button";

export default function AngerScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: logs, isLoading } = useAngerLogs(user?.id ?? null);

  const recent = logs?.slice(0, 5) ?? [];
  const avgArousal =
    recent.length > 0
      ? Math.round(recent.reduce((sum, l) => sum + l.arousalLevel, 0) / recent.length)
      : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1" className="flex-1">
                  {t("anger.title")}
                </Text>
                <HelpButton helpKey="anger" />
              </View>
              <Text variant="muted">{t("anger.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/anger/new")} size="sm">
              <Text>{t("anger.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("anger.loading")} />
          ) : (logs?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("anger.empty")}</CardTitle>
                <CardDescription>{t("anger.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {(logs?.length ?? 0) >= 3 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("anger.patternInsightTitle")}</CardTitle>
                    <CardDescription>
                      {t("anger.patternInsightDescription", {
                        count: logs!.length,
                        average: avgArousal,
                      })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              <View className="gap-3">
                <Text variant="h3">{t("anger.recent")}</Text>
                {logs!.map((log) => (
                  <AccessibleCardLink
                    key={log.id}
                    title={log.triggerText}
                    description={t("anger.arousalLabel", { value: log.arousalLevel })}
                    onPress={() => router.push(`/modules/cbt/anger/${log.id}`)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
