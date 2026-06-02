import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { cn } from "@/lib/utils";
import { obstacleTagsForStage } from "@/src/features/meditation/obstacles";
import {
  useMeditationProgramState,
  useSaveMeditationSession,
} from "@/src/features/meditation/queries";
import type {
  DistractionLevel,
  DullnessLevel,
  MeditationObstacleTag,
  StageNumber,
} from "@/src/features/meditation/types";
import { useSession } from "@/src/providers/session-provider";

const DULLNESS_OPTIONS: DullnessLevel[] = ["none", "subtle", "strong"];
const DISTRACTION_OPTIONS: DistractionLevel[] = ["none", "subtle", "gross"];

export default function MeditationSessionLogScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const params = useLocalSearchParams<{ duration?: string }>();
  const durationMinutes = Math.max(1, Number(params.duration) || 15);

  const { data: programState } = useMeditationProgramState(userId);
  const saveMutation = useSaveMeditationSession(userId);

  const currentStage: StageNumber = (programState?.currentStage ?? 1) as StageNumber;

  const [reflection, setReflection] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [dullness, setDullness] = useState<DullnessLevel | null>(null);
  const [distraction, setDistraction] = useState<DistractionLevel | null>(null);
  const [mindWandering, setMindWandering] = useState<number | null>(null);
  const [obstacleTags, setObstacleTags] = useState<MeditationObstacleTag[]>([]);

  function toggleObstacleTag(tag: MeditationObstacleTag) {
    setObstacleTags((prev) =>
      prev.includes(tag) ? prev.filter((existing) => existing !== tag) : [...prev, tag],
    );
  }

  function handleSave(skipReflection: boolean) {
    saveMutation.mutate(
      {
        stageAtSession: currentStage,
        durationMinutes,
        techniqueUsed: null,
        reflection: skipReflection ? "" : reflection,
        moodAfter: skipReflection ? null : moodAfter,
        dullnessLevel: skipReflection ? null : dullness,
        distractionLevel: skipReflection ? null : distraction,
        mindWanderingEpisodes: skipReflection ? null : mindWandering,
        obstacleTags: skipReflection ? [] : obstacleTags,
      },
      {
        onSettled: () => router.replace("/tools/meditation"),
      },
    );
  }

  const showMindWandering = currentStage === 2 || currentStage === 3;
  const showDullness = currentStage === 4 || currentStage === 5;
  const showDistraction = currentStage === 4 || currentStage === 6;
  const availableObstacleTags = obstacleTagsForStage(currentStage);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <ScreenHeader title={t("module.session.title")} titleVariant="h2" />

          <View className="gap-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="gap-1 pt-6">
                <CardTitle>{t("complete.title")}</CardTitle>
                <Text variant="muted">{t("complete.subtitle", { count: durationMinutes })}</Text>
              </CardContent>
            </Card>

            <View className="gap-3">
              <Text className="text-sm font-semibold">{t("module.session.postSitTitle")}</Text>
              <Text variant="muted" className="text-xs">
                {t("module.session.postSitSubtitle")}
              </Text>
            </View>

            {showMindWandering ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold">
                  {t("stages.s2.prompts.wanderingCount")}
                </Text>
                <View className="flex-row gap-2">
                  {[0, 1, 2, 3, 5, 8].map((n) => (
                    <Pressable
                      key={n}
                      accessibilityRole="button"
                      accessibilityState={{ selected: mindWandering === n }}
                      onPress={() => setMindWandering(mindWandering === n ? null : n)}
                      className={cn(
                        "size-10 items-center justify-center rounded-full border",
                        mindWandering === n
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          mindWandering === n ? "text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {n === 8 ? "8+" : n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {showDullness ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold">{t("module.session.dullnessLabel")}</Text>
                <View className="flex-row gap-2">
                  {DULLNESS_OPTIONS.map((level) => (
                    <Pressable
                      key={level}
                      accessibilityRole="button"
                      accessibilityState={{ selected: dullness === level }}
                      onPress={() => setDullness(dullness === level ? null : level)}
                      className={cn(
                        "flex-1 items-center rounded-md border px-3 py-2",
                        dullness === level
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wider",
                          dullness === level ? "text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {t(`module.session.dullness.${level}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {showDistraction ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold">
                  {t("module.session.distractionLabel")}
                </Text>
                <View className="flex-row gap-2">
                  {DISTRACTION_OPTIONS.map((level) => (
                    <Pressable
                      key={level}
                      accessibilityRole="button"
                      accessibilityState={{ selected: distraction === level }}
                      onPress={() => setDistraction(distraction === level ? null : level)}
                      className={cn(
                        "flex-1 items-center rounded-md border px-3 py-2",
                        distraction === level
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wider",
                          distraction === level ? "text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {t(`module.session.distraction.${level}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {availableObstacleTags.length > 0 ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold">{t("module.session.obstaclesLabel")}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableObstacleTags.map((tag) => {
                    const selected = obstacleTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => toggleObstacleTag(tag)}
                        className={cn(
                          "rounded-full border px-3 py-1.5",
                          selected
                            ? "border-primary bg-primary"
                            : "border-border bg-card active:bg-muted",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-xs font-semibold",
                            selected ? "text-primary-foreground" : "text-foreground",
                          )}
                        >
                          {t(`module.obstacles.${tag}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-sm font-semibold">{t("module.session.moodLabel")}</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected: moodAfter === n }}
                    onPress={() => setMoodAfter(moodAfter === n ? null : n)}
                    className={cn(
                      "size-9 items-center justify-center rounded-full border",
                      moodAfter === n
                        ? "border-primary bg-primary"
                        : "border-border bg-card active:bg-muted",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        moodAfter === n ? "text-primary-foreground" : "text-foreground",
                      )}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold">{t("module.session.reflectionLabel")}</Text>
              <Textarea
                value={reflection}
                onChangeText={setReflection}
                placeholder={t("module.session.reflectionPlaceholder")}
                accessibilityLabel={t("module.session.reflectionLabel")}
                numberOfLines={4}
              />
            </View>

            <View className="gap-2">
              <Button onPress={() => handleSave(false)} disabled={saveMutation.isPending}>
                <Text>{t("module.session.save")}</Text>
              </Button>
              <Button
                onPress={() => handleSave(true)}
                variant="ghost"
                disabled={saveMutation.isPending}
              >
                <Text>{t("module.session.skip")}</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
