import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { EmptyState, LoadingState } from "@/src/components/app/screen-state";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { ThoughtRecordRow } from "@/src/features/cbt/thought-record-row";
import { useSession } from "@/src/providers/session-provider";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function CbtHistoryScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data, isLoading } = useThoughtRecords(user?.id ?? null);
  // `dayKey` is the civil day the record was written on - compare, never
  // re-bucket, so a record caught before flying east stays on its own day (#330).
  const records = (data ?? []).filter((record) => record.dayKey === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("history.title")} />
            <Text variant="muted">{t("history.description")}</Text>
          </View>

          {isLoading ? <LoadingState title={t("history.loading")} /> : null}

          {!isLoading && !records.length ? (
            <EmptyState
              icon="history"
              title={t("history.empty")}
              description={t("history.emptyDescription")}
            />
          ) : null}

          {/* The same hairline row as the overview's recent records (#1386).
              This screen is what sits behind that section's door, so converting
              only the overview would change the row shape mid-journey. */}
          <View>
            {records.map((record) => (
              <ThoughtRecordRow
                key={record.id}
                record={record}
                onPress={() => pushWithOrigin(`/modules/cbt/history/${record.id}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
