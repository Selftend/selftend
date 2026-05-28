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
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { LoadingState } from "@/src/components/app/screen-state";
import { ToolHero } from "@/src/components/app/tool-hero";
import { MoodScale } from "@/src/components/app/mood-scale";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { cn } from "@/lib/utils";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { ManageEmotionsModal } from "@/src/features/mood/manage-emotions-modal";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { MoodLog } from "@/src/features/mood/types";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

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
  const { t: tMood } = useTranslation("mood");
  const { user } = useSession();
  const params = useLocalSearchParams<{
    completeActivityId?: string | string[];
    linkedStrategy?: string | string[];
    score?: string | string[];
  }>();
  const linkedStrategy = paramValue(params.linkedStrategy) ?? null;
  const completeActivityId = paramValue(params.completeActivityId) ?? null;
  const initialScore = paramValue(params.score) ? Number(paramValue(params.score)) : null;

  const { selectedDate } = useSelectedDate();
  const { data: cachedList } = useMoodLogs(mode === "edit" ? (user?.id ?? null) : null, 30);
  const fromCache = moodId ? (cachedList?.find((log) => log.id === moodId) ?? null) : null;
  const { data: fetched, isLoading } = useMoodLog(
    mode === "edit" && !fromCache ? (user?.id ?? null) : null,
    mode === "edit" && !fromCache ? moodId : null,
  );
  const existingEntry: MoodLog | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveMoodLog(user?.id ?? null);
  const completeActivityMutation = useCompleteActivity(user?.id ?? null);
  const [moodScore, setMoodScore] = useState<number | null>(initialScore);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState<string>(
    mode === "create" ? loggedAtForSelectedDate(selectedDate) : new Date().toISOString(),
  );
  const [error, setError] = useState("");
  const [situation, setSituation] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [behaviours, setBehaviours] = useState("");
  const [bodilySensations, setBodilySensations] = useState("");
  const [showDeeper, setShowDeeper] = useState(false);
  const [manageEmotionsOpen, setManageEmotionsOpen] = useState(false);
  const editMode = mode === "edit";
  const saving = saveMutation.isPending || completeActivityMutation.isPending;
  const { allEmotions } = useEmotionDisplay();

  useEffect(() => {
    if (!existingEntry) return;

    setMoodScore(existingEntry.moodScore);
    setEmotions(existingEntry.emotions);
    setNotes(existingEntry.notes);
    setLoggedAt(existingEntry.loggedAt);
    setSituation(existingEntry.situation);
    setThoughts(existingEntry.thoughts);
    setBehaviours(existingEntry.behaviours);
    setBodilySensations(existingEntry.bodilySensations);
    setShowDeeper(
      Boolean(
        existingEntry.situation ||
        existingEntry.thoughts ||
        existingEntry.behaviours ||
        existingEntry.bodilySensations,
      ),
    );
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
          loggedAt,
          situation,
          thoughts,
          behaviours,
          bodilySensations,
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
            <ScreenHeader title={t("mood.editTitle")} />
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
        {editMode ? (
          <View className="gap-2">
            <ScreenHeader title={t("mood.editTitle")} />
            <Text variant="muted">{t("mood.editDescription")}</Text>
          </View>
        ) : (
          <ToolHero
            hue="be"
            icon="mood"
            title={tMood("checkin.title")}
            moduleLabel={tMood("checkin.moduleLabel")}
            tagline={tMood("checkin.tagline")}
          />
        )}

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
          <View className="flex-row items-center justify-between">
            <Label>{t("mood.emotionsLabel")}</Label>
            <Pressable
              onPress={() => setManageEmotionsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={tMood("emotions.manage.title")}
            >
              <Text className="text-xs text-primary">{tMood("emotions.manage.title")}</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {allEmotions.map((emotion) => {
              const selected = emotions.includes(emotion.id);
              return (
                <Pressable
                  key={emotion.id}
                  accessibilityLabel={emotion.name}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleEmotion(emotion.id)}
                  className={cn(
                    "min-w-[72px] items-center gap-1 rounded-2xl border-2 px-2 py-2",
                    selected ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  <Text className="text-2xl">{emotion.emoji}</Text>
                  <Text
                    className={cn(
                      "text-center text-[11px]",
                      selected ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                    numberOfLines={1}
                  >
                    {emotion.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ManageEmotionsModal
          visible={manageEmotionsOpen}
          onClose={() => setManageEmotionsOpen(false)}
        />

        <View className="gap-2">
          <Label>{t("mood.loggedAtLabel")}</Label>
          <DateTimeField
            value={loggedAt}
            onChange={setLoggedAt}
            accessibilityLabel={t("mood.loggedAtLabel")}
          />
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

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mood.goDeeper")}
            onPress={() => setShowDeeper((v) => !v)}
            className="flex-row items-center gap-2"
          >
            <Icon
              name={showDeeper ? "expand-less" : "expand-more"}
              className="size-5 text-muted-foreground"
            />
            <Text className="text-sm font-medium">{t("mood.goDeeper")}</Text>
          </Pressable>
          {showDeeper ? (
            <View className="gap-4">
              <View className="gap-2">
                <Label>{t("mood.situationLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("mood.situationLabel")}
                  onChangeText={setSituation}
                  placeholder={t("mood.situationPlaceholder")}
                  value={situation}
                />
              </View>
              <View className="gap-2">
                <Label>{t("mood.thoughtsLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("mood.thoughtsLabel")}
                  onChangeText={setThoughts}
                  placeholder={t("mood.thoughtsPlaceholder")}
                  value={thoughts}
                />
              </View>
              <View className="gap-2">
                <Label>{t("mood.behavioursLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("mood.behavioursLabel")}
                  onChangeText={setBehaviours}
                  placeholder={t("mood.behavioursPlaceholder")}
                  value={behaviours}
                />
              </View>
              <View className="gap-2">
                <Label>{t("mood.sensationsLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("mood.sensationsLabel")}
                  onChangeText={setBodilySensations}
                  placeholder={t("mood.sensationsPlaceholder")}
                  value={bodilySensations}
                />
              </View>
            </View>
          ) : null}
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
