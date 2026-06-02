import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
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
import { ScreenHeader } from "@/src/components/app/screen-header";

function hasExpandedDetail(data: {
  emotionIntensityBefore: number | null;
  emotionIntensityAfter: number | null;
  evidenceFor: string[];
  evidenceAgainst: string[];
  outcomeNotes: string;
}) {
  return Boolean(
    data.emotionIntensityBefore !== null ||
    data.emotionIntensityAfter !== null ||
    data.evidenceFor.length > 0 ||
    data.evidenceAgainst.length > 0 ||
    data.outcomeNotes.trim(),
  );
}

function displayText(value: string, fallback: string) {
  return value.trim() || fallback;
}

export default function ThoughtRecordDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === "string" ? id : null;
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
      router.replace("/modules/cbt/history" as Parameters<typeof router.replace>[0]);
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
            <ScreenHeader title={t("detail.notFound")} />
            <ErrorState
              title={t("detail.notFoundLabel")}
              description={t("detail.notFoundDescription")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showExpandedDetail = hasExpandedDetail(data);
  const notFilled = t("record.summaryNotFilled");
  const intensityShift =
    data.emotionIntensityBefore !== null && data.emotionIntensityAfter !== null
      ? data.emotionIntensityAfter - data.emotionIntensityBefore
      : null;

  const renderList = (title: string, items: string[]) =>
    items.length > 0 ? (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-2">
            {items.map((item, index) => (
              <Text key={`${item}-${index}`}>- {item}</Text>
            ))}
          </View>
        </CardContent>
      </Card>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("detail.title")} />
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
              <CardDescription>{displayText(data.situation, notFilled)}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.nats")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {data.nats.length > 0 ? (
                  [...data.nats]
                    .sort((a, b) => (b.isHotThought ? 1 : 0) - (a.isHotThought ? 1 : 0))
                    .map((nat, index) => (
                      <Card
                        key={index}
                        className={nat.isHotThought ? "border-primary border-2" : ""}
                      >
                        <CardHeader>
                          <View className="flex-row items-center justify-between gap-3">
                            <CardTitle className="flex-1">{nat.text}</CardTitle>
                            {nat.isHotThought ? (
                              <Text variant="muted">{t("record.hotThoughtBadge")} 🔥</Text>
                            ) : null}
                          </View>
                          {nat.beliefRating !== null ? (
                            <CardDescription>
                              {t("record.beliefRating")}: {nat.beliefRating}%
                            </CardDescription>
                          ) : null}
                        </CardHeader>
                      </Card>
                    ))
                ) : (
                  <Text variant="muted">{notFilled}</Text>
                )}
              </View>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("record.emotions")}</CardTitle>
              <CardDescription>{data.emotions.join(", ") || notFilled}</CardDescription>
            </CardHeader>
          </Card>
          {showExpandedDetail ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.expandedTitle")}</CardTitle>
                <CardDescription>
                  {intensityShift !== null
                    ? t("detail.intensityShift", {
                        after: data.emotionIntensityAfter,
                        before: data.emotionIntensityBefore,
                        shift: intensityShift,
                      })
                    : t("detail.expandedDescription")}
                </CardDescription>
              </CardHeader>
              {data.emotionIntensityBefore !== null || data.emotionIntensityAfter !== null ? (
                <CardContent>
                  <View className="gap-2">
                    {data.emotionIntensityBefore !== null ? (
                      <Text>
                        {t("record.intensityBefore")}: {data.emotionIntensityBefore}
                      </Text>
                    ) : null}
                    {data.emotionIntensityAfter !== null ? (
                      <Text>
                        {t("record.intensityAfter")}: {data.emotionIntensityAfter}
                      </Text>
                    ) : null}
                  </View>
                </CardContent>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>{t("record.patterns")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {data.distortions.length > 0 ? (
                  data.distortions.map((distortionKey) => (
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
                  ))
                ) : (
                  <Text variant="muted">{notFilled}</Text>
                )}
              </View>
            </CardContent>
          </Card>
          {showExpandedDetail ? (
            <>
              {renderList(t("record.evidenceFor"), data.evidenceFor)}
              {renderList(t("record.evidenceAgainst"), data.evidenceAgainst)}
            </>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>{t("record.balancedThought")}</CardTitle>
              <CardDescription>{displayText(data.balancedThought, notFilled)}</CardDescription>
            </CardHeader>
          </Card>
          {data.outcomeNotes.trim() ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("record.outcomeNotes")}</CardTitle>
                <CardDescription>{data.outcomeNotes}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/tools/breathing/session",
                params: { pattern: "box-breathing" },
              })
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("breathing.nudgeTitle")}</CardTitle>
                <CardDescription>{t("breathing.nudgeDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Text className="text-primary text-sm font-medium">
                  {t("breathing.nudgeButton")} →
                </Text>
              </CardContent>
            </Card>
          </Pressable>
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background p-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={() =>
                router.push({ pathname: "/modules/cbt/new", params: { recordId: data.id } })
              }
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
              <Text>{t("detail.archiveButton")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
