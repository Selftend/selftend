import { router, useLocalSearchParams, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { BackButton } from "@/src/components/app/back-button";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { LoadingState } from "@/src/components/app/screen-state";
import { MoodScale } from "@/src/components/app/mood-scale";
import { emotionOptions } from "@/src/constants/emotions";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import type { MoodLog } from "@/src/features/mood/types";
import { useSession } from "@/src/providers/session-provider";

interface MoodEntryEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  moodId?: string | null;
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function MoodEntryEditorScreen({
  fallbackHref,
  mode,
  moodId = null,
}: MoodEntryEditorScreenProps) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const params = useLocalSearchParams<{
    completeActivityId?: string | string[];
    linkedStrategy?: string | string[];
  }>();
  const linkedStrategy = paramValue(params.linkedStrategy) ?? null;
  const completeActivityId = paramValue(params.completeActivityId) ?? null;

  const { data: cachedList } = useMoodLogs(mode === "edit" ? (user?.id ?? null) : null, 30);
  const fromCache = moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null;
  const { data: fetched, isLoading } = useMoodLog(
    mode === "edit" && !fromCache ? (user?.id ?? null) : null,
    mode === "edit" && !fromCache ? moodId : null,
  );
  const existingEntry: MoodLog | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveMoodLog(user?.id ?? null);
  const completeActivityMutation = useCompleteActivity(user?.id ?? null);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const editMode = mode === "edit";
  const saving = saveMutation.isPending || completeActivityMutation.isPending;

  useEffect(() => {
    if (!existingEntry) return;

    setMoodScore(existingEntry.moodScore);
    setEmotions(existingEntry.emotions);
    setNotes(existingEntry.notes);
    setError("");
  }, [existingEntry]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  const handleSave = async () => {
    if (!moodScore || !user) return;
    setError("");
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          moodScore,
          emotions,
          notes,
          linkedStrategy: linkedStrategy ?? existingEntry?.linkedStrategy ?? null,
        },
        moodLogId: editMode ? (moodId ?? undefined) : undefined,
      });

      if (completeActivityId) {
        await completeActivityMutation.mutateAsync({
          activityId: completeActivityId,
          moodAfter: moodScore,
        });
        router.replace(
          `/modules/cbt/activities/${completeActivityId}` as Parameters<typeof router.replace>[0],
        );
        return;
      }

      router.replace(`/tools/mood-tracker/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mood.saveError"));
    }
  };

  const toggleEmotion = (emotion: string) => {
    setEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion],
    );
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("mood.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingEntry) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("mood.editTitle")}</Text>
            </View>
            <Text variant="muted">{t("mood.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showCrisis = moodScore !== null && moodScore <= 1;
  const showBreathingNudge = moodScore !== null && moodScore <= 2;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6 pb-12">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{editMode ? t("mood.editTitle") : t("mood.title")}</Text>
          </View>
          <Text variant="muted">
            {editMode ? t("mood.editDescription") : t("mood.description")}
          </Text>
        </View>

        {showCrisis ? <CrisisSupportCallout /> : null}

        <View className="gap-3">
          <Label>{t("mood.scoreLabel")}</Label>
          <Text variant="muted">{t("mood.scoreHint")}</Text>
          <MoodScale value={moodScore} onChange={setMoodScore} />
        </View>

        {showBreathingNudge ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/tools/breathing/box-breathing")}
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
        ) : null}

        <View className="gap-3">
          <Label>{t("mood.emotionsLabel")}</Label>
          {emotionOptions.map((emotion) => {
            const checked = emotions.includes(emotion);
            const label = t(`emotions.${emotion.toLowerCase()}`);
            return (
              <View key={emotion} className="flex-row items-center gap-3">
                <Checkbox
                  accessibilityLabel={label}
                  checked={checked}
                  onCheckedChange={() => toggleEmotion(emotion)}
                />
                <Label onPress={() => toggleEmotion(emotion)}>{label}</Label>
              </View>
            );
          })}
        </View>

        <View className="gap-2">
          <Label>{t("mood.notesLabel")}</Label>
          <Textarea
            accessibilityLabel={t("mood.notesLabel")}
            onChangeText={setNotes}
            placeholder={t("mood.notesPlaceholder")}
            value={notes}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("mood.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button disabled={!moodScore || saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{editMode ? t("mood.update") : t("mood.save")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
