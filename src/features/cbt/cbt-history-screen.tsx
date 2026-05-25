import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { EmptyState, LoadingState } from "@/src/components/app/screen-state";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import type { NegativeAutomaticThought } from "@/src/features/cbt/types";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";
import { BackButton } from "@/src/components/app/back-button";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

function getRecordTitle(
  record: { nats: NegativeAutomaticThought[]; situation: string },
  fallback: string,
) {
  const hotNat = record.nats.find((n) => n.isHotThought) ?? record.nats[0];
  return hotNat?.text.trim() || record.situation.trim() || fallback;
}

export default function CbtHistoryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data, isLoading } = useThoughtRecords(user?.id ?? null);
  const records = (data ?? []).filter(
    (record) => toLocalDateKey(record.createdAt) === selectedDate,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("history.title")}</Text>
            </View>
            <Text variant="muted">{t("history.description")}</Text>
          </View>

          {isLoading ? <LoadingState title={t("history.loading")} /> : null}

          {!isLoading && !records.length ? (
            <EmptyState title={t("history.empty")} description={t("history.emptyDescription")} />
          ) : null}

          {records.map((record) => (
            <AccessibleCardLink
              key={record.id}
              description={t("history.recordSummary", {
                timestamp: formatTimestamp(record.updatedAt),
                balancedThought: record.balancedThought.trim() || t("history.recordSummaryEmpty"),
              })}
              onPress={() => router.push(`/modules/cbt/history/${record.id}`)}
              title={getRecordTitle(record, t("history.untitledRecord"))}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
