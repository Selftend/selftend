import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";
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
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { useMoodLog, useMoodLogs } from "@/src/features/mood/queries";
import type { MoodLog } from "@/src/features/mood/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useSession } from "@/src/providers/session-provider";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function MoodDetailScreen() {
  const { t } = useTranslation("mood");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const moodId = typeof id === "string" ? id : null;

  const { data: cachedList } = useMoodLogs(user?.id ?? null, 30);
  const fromCache = useMemo(
    () => (moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null),
    [cachedList, moodId],
  );

  const { data: fetched, isLoading } = useMoodLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : moodId,
  );

  const entry: MoodLog | null = fromCache ?? fetched ?? null;

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
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("detail.title")}</Text>
            </View>
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
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("detail.title")}</Text>
            </View>
            <Text variant="muted">{when}</Text>
            <Button
              onPress={() =>
                router.push(
                  `/tools/mood-tracker/${entry.id}/edit` as Parameters<typeof router.push>[0],
                )
              }
              variant="secondary"
              className="self-start"
            >
              <Icon name="edit" className="size-4" />
              <Text>{t("detail.edit")}</Text>
            </Button>
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
              <Text>{formatTimestamp(entry.loggedAt)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.emotions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {entry.emotions.length > 0 ? (
                <View className="flex-row flex-wrap gap-1.5">
                  {entry.emotions.map((emotion) => (
                    <Badge key={emotion} variant="secondary">
                      <Text className="text-xs">{tCbt(`emotions.${emotion.toLowerCase()}`)}</Text>
                    </Badge>
                  ))}
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
    </SafeAreaView>
  );
}
