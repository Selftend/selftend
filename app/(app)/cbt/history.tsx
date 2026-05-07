import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { AccessibleCardLink } from "@/src/components/accessible-card-link";
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
            <AccessibleCardLink
              key={record.id}
              description={t("history.recordSummary", {
                timestamp: formatTimestamp(record.updatedAt),
                balancedThought: record.balancedThought,
              })}
              onPress={() => router.push(`/cbt/${record.id}`)}
              title={record.automaticThought}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
