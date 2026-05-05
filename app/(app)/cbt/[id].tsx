import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { distortionLookup } from "@/src/constants/distortions";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function ThoughtRecordDetailScreen() {
  const { t } = useTranslation("cbt");
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
      router.replace("/cbt/history");
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : t("detail.archiveError"));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">{t("detail.loading")}</Text>
          <ActivityIndicator />
          <Text variant="muted">{t("detail.loadingDescription")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">{t("detail.notFound")}</Text>
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.notFoundLabel")}</CardTitle>
                <CardDescription>{t("detail.notFoundDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("detail.title")}</Text>
            <Text variant="muted">
              {t("detail.updated", { timestamp: formatTimestamp(data.updatedAt) })}
            </Text>
          </View>

          {archiveError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.archiveProblem")}</CardTitle>
                <CardDescription>{archiveError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("record.situation")}</CardTitle>
              <CardDescription>{data.situation}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.automaticThought")}</CardTitle>
              <CardDescription>{data.automaticThought}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.emotions")}</CardTitle>
              <CardDescription>{data.emotions.join(", ")}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.patterns")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {data.distortions.map((distortionKey) => (
                  <Card key={distortionKey}>
                    <CardHeader>
                      <CardTitle>
                        {t(`distortions.${distortionKey}.title`, {
                          defaultValue: distortionLookup[distortionKey]?.title ?? distortionKey,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t(`distortions.${distortionKey}.shortDescription`, {
                          defaultValue: distortionLookup[distortionKey]?.shortDescription ?? "",
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </View>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.balancedThought")}</CardTitle>
              <CardDescription>{data.balancedThought}</CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background p-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={() => router.push({ pathname: "/cbt/new", params: { recordId: data.id } })}
              variant="secondary"
            >
              <Text>{t("detail.editButton")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              disabled={archiveMutation.isPending}
              onPress={() => void handleArchive()}
              variant="destructive"
            >
              {archiveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {archiveMutation.isPending ? t("detail.archiveButton") : t("detail.archiveButton")}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
