import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState } from "@/src/components/screen-state";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function CbtHistoryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data, isLoading } = useThoughtRecords(user?.id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("history.title")}</Text>
            <Text variant="muted">{t("history.description")}</Text>
          </View>

          {isLoading ? <LoadingState title={t("history.loading")} /> : null}

          {!isLoading && !data?.length ? (
            <EmptyState title={t("history.empty")} description={t("history.emptyDescription")} />
          ) : null}

          {data?.map((record) => (
            <Pressable key={record.id} onPress={() => router.push(`/cbt/${record.id}`)}>
              <Card>
                <CardHeader>
                  <CardTitle>{record.automaticThought}</CardTitle>
                  <CardDescription>
                    {t("history.recordSummary", {
                      timestamp: formatTimestamp(record.updatedAt),
                      balancedThought: record.balancedThought,
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
