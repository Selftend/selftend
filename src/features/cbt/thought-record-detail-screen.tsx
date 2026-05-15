import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionLookup } from "@/src/constants/distortions";
import { ErrorState, LoadingState } from "@/src/components/app/screen-state";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatTimestamp } from "@/src/utils/date";
import { BackButton } from "@/src/components/app/back-button";

export default function ThoughtRecordDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = useMemo(() => (typeof id === "string" ? id : null), [id]);
  const { user } = useSession();
  const [archiveError, setArchiveError] = useState("");
  const { data, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const archiveMutation = useArchiveThoughtRecord(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const handleArchive = async () => {
    if (!recordId) {
      return;
    }

    try {
      setArchiveError("");
      await archiveMutation.mutateAsync(recordId);
      showToast({
        title: t("common:feedback.archived"),
        tone: "success",
      });
      router.replace("/cbt/history");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("detail.archiveError");
      setArchiveError(message);
      showToast({
        title: t("detail.archiveProblem"),
        description: message,
        tone: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.loading")} description={t("detail.loadingDescription")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("detail.notFound")}</Text>
            </View>
            <ErrorState
              title={t("detail.notFoundLabel")}
              description={t("detail.notFoundDescription")}
            />
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
