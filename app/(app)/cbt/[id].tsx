import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useMemo, useState } from "react";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { EmptyState } from "@/src/components/empty-state";
import { LoadingState } from "@/src/components/loading-state";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { distortionLookup } from "@/src/constants/distortions";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function ThoughtRecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = useMemo(() => (typeof id === "string" ? id : null), [id]);
  const { user } = useSession();
  const [archiveError, setArchiveError] = useState("");
  const { data, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const archiveMutation = useArchiveThoughtRecord(user?.id ?? null);

  const handleArchive = async () => {
    if (!recordId) {
      return;
    }

    try {
      setArchiveError("");
      await archiveMutation.mutateAsync(recordId);
      router.replace("/(app)/(tabs)/history");
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Unable to archive the record.");
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false} title="Loading record">
        <LoadingState label="Fetching your saved record..." />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Record not found">
        <EmptyState body="The record may have been archived or removed." title="Nothing to show" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={() => router.push({ pathname: "/cbt/new", params: { recordId: data.id } })}
              text="Edit"
              variant="secondary"
            />
          </View>
          <View className="flex-1">
            <Button
              isLoading={archiveMutation.isPending}
              onPress={() => void handleArchive()}
              text="Archive"
              variant="danger"
            />
          </View>
        </View>
      }
      subtitle={`Updated ${formatTimestamp(data.updatedAt)}`}
      title="Thought record"
    >
      {archiveError ? <NoticeCard body={archiveError} title="Archive problem" tone="warning" /> : null}

      <DetailCard body={data.situation} title="Situation" />
      <DetailCard body={data.automaticThought} title="Automatic thought" />
      <DetailCard body={data.emotions.join(", ")} title="Emotions" />
      <Card>
        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink">Thinking patterns</Text>
          {data.distortions.map((distortionKey) => (
            <View key={distortionKey} className="rounded-2xl bg-mist px-4 py-3">
              <Text className="text-base font-semibold text-ink">
                {distortionLookup[distortionKey]?.title ?? distortionKey}
              </Text>
              <Text className="mt-1 text-sm leading-6 text-ink/70">
                {distortionLookup[distortionKey]?.shortDescription ?? "Saved distortion key."}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <DetailCard body={data.balancedThought} title="Balanced thought" />
    </Screen>
  );
}

function DetailCard({ body, title }: { body: string; title: string }) {
  return (
    <Card>
      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink">{title}</Text>
        <Text className="text-sm leading-6 text-ink/70">{body}</Text>
      </View>
    </Card>
  );
}
