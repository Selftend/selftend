import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { useDeleteMoodLog, useMoodLog, useMoodLogs } from "@/src/features/mood/queries";
import type { MoodLog } from "@/src/features/mood/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatLocalTimestamp } from "@/src/utils/date";

export default function MoodDetailScreen() {
  const { t } = useTranslation("mood");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const { resolveEmotion } = useEmotionDisplay();
  const { id } = useLocalSearchParams<{ id: string }>();
  const moodId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useMoodLogs(user?.id ?? null, 30);
  const fromCache = moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null;

  const { data: fetched, isLoading } = useMoodLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : moodId,
  );

  const entry: MoodLog | null = fromCache ?? fetched ?? null;

  const deleteMutation = useDeleteMoodLog(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = async () => {
    if (!entry) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/mood-tracker" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  if (!fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const trimmedNotes = entry.notes.trim();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{when}</Text>
            <View className="flex-row gap-3">
              <Button
                onPress={() => router.push(`/tools/mood-tracker/${entry.id}/edit`)}
                variant="secondary"
              >
                <Icon name="edit" className="size-4" />
                <Text>{t("detail.edit")}</Text>
              </Button>
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("detail.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.score")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center gap-3">
                <Text className="text-5xl">{MOOD_EMOJI_BY_SCORE[entry.moodScore] ?? ""}</Text>
                <Text className="text-4xl font-bold">{entry.moodScore}</Text>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.loggedAt")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{formatLocalTimestamp(entry.loggedAt)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.emotions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {entry.emotions.length > 0 ? (
                <View className="flex-row flex-wrap gap-1.5">
                  {entry.emotions.map((emotionId) => {
                    const display = resolveEmotion(emotionId);
                    return (
                      <Badge key={emotionId} variant="secondary">
                        <Text className="text-xs">
                          {display.emoji} {display.name}
                        </Text>
                      </Badge>
                    );
                  })}
                </View>
              ) : (
                <Text variant="muted">{t("detail.noEmotions")}</Text>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {trimmedNotes ? (
                <Text>{trimmedNotes}</Text>
              ) : (
                <Text variant="muted">{t("detail.noNotes")}</Text>
              )}
            </CardContent>
          </Card>

          {[
            { title: tCbt("mood.situationLabel"), value: entry.situation.trim() },
            { title: tCbt("mood.thoughtsLabel"), value: entry.thoughts.trim() },
            { title: tCbt("mood.behavioursLabel"), value: entry.behaviours.trim() },
            { title: tCbt("mood.sensationsLabel"), value: entry.bodilySensations.trim() },
          ]
            .filter((box) => box.value.length > 0)
            .map((box) => (
              <Card key={box.title}>
                <CardHeader>
                  <CardTitle>{box.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text>{box.value}</Text>
                </CardContent>
              </Card>
            ))}

          {entry.linkedStrategy ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.linkedStrategy")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">
                  <Text className="text-xs">{entry.linkedStrategy}</Text>
                </Badge>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("detail.confirmDelete.cancel")}
        confirmLabel={t("detail.confirmDelete.confirm")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("detail.confirmDelete.message")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("detail.confirmDelete.title")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}
