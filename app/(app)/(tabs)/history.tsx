import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/src/components/card";
import { EmptyState } from "@/src/components/empty-state";
import { LoadingState } from "@/src/components/loading-state";
import { Screen } from "@/src/components/screen";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function HistoryScreen() {
  const { user } = useSession();
  const { data, isLoading } = useThoughtRecords(user?.id ?? null);

  return (
    <Screen
      subtitle="Saved records stay private, editable, and easy to revisit."
      title="Thought history"
    >
      {isLoading ? <LoadingState label="Loading thought records..." /> : null}

      {!isLoading && !data?.length ? (
        <EmptyState
          body="Create your first record from the CBT section. It will appear here once saved."
          title="No thought records yet"
        />
      ) : null}

      {data?.map((record) => (
        <Pressable key={record.id} onPress={() => router.push(`/cbt/${record.id}`)}>
          <Card>
            <View className="gap-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                Updated {formatTimestamp(record.updatedAt)}
              </Text>
              <Text className="text-lg font-semibold text-ink" numberOfLines={2}>
                {record.automaticThought}
              </Text>
              <Text className="text-sm leading-6 text-ink/70" numberOfLines={3}>
                {record.balancedThought}
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
