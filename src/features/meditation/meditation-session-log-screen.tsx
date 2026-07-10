import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
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
import { DEFAULT_INTERACTIVE_HIT_SLOP, toggleButtonStateProps } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";

const DULLNESS_OPTIONS: DullnessLevel[] = ["none", "subtle", "strong"];
const DISTRACTION_OPTIONS: DistractionLevel[] = ["none", "subtle", "gross"];
const MIND_WANDERING_OPTIONS = [0, 1, 2, 3, 5, 8];
const MOOD_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

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

  const mindWanderingRoving = useRovingFocus({
    count: MIND_WANDERING_OPTIONS.length,
    activeIndex: Math.max(0, MIND_WANDERING_OPTIONS.indexOf(mindWandering ?? -1)),
    onActivate: (index) => setMindWandering(MIND_WANDERING_OPTIONS[index]),
  });
  const dullnessRoving = useRovingFocus({
    count: DULLNESS_OPTIONS.length,
    activeIndex: Math.max(0, dullness ? DULLNESS_OPTIONS.indexOf(dullness) : -1),
    onActivate: (index) => setDullness(DULLNESS_OPTIONS[index]),
  });
  const distractionRoving = useRovingFocus({
    count: DISTRACTION_OPTIONS.length,
    activeIndex: Math.max(0, distraction ? DISTRACTION_OPTIONS.indexOf(distraction) : -1),
    onActivate: (index) => setDistraction(DISTRACTION_OPTIONS[index]),
  });
  const moodRoving = useRovingFocus({
    count: MOOD_OPTIONS.length,
    activeIndex: Math.max(0, MOOD_OPTIONS.indexOf(moodAfter ?? -1)),
    onActivate: (index) => setMoodAfter(MOOD_OPTIONS[index]),
  });

  function toggleObstacleTag(tag: MeditationObstacleTag) {
    setObstacleTags((prev) =>
      prev.includes(tag) ? prev.filter((existing) => existing !== tag) : [...prev, tag],
    );
  }

  const handleSave = useSingleFlight(async (skipReflection: boolean) => {
    try {
      await saveMutation.mutateAsync({
        stageAtSession: currentStage,
        durationMinutes,
        techniqueUsed: null,
        reflection: skipReflection ? "" : reflection,
        moodAfter: skipReflection ? null : moodAfter,
        dullnessLevel: skipReflection ? null : dullness,
        distractionLevel: skipReflection ? null : distraction,
        mindWanderingEpisodes: skipReflection ? null : mindWandering,
        obstacleTags: skipReflection ? [] : obstacleTags,
      });
      router.replace("/tools/meditation");
    } catch {
      // Failure is surfaced via the global save-failed toast.
    }
  });

  const showMindWandering = currentStage === 2 || currentStage === 3;
  const showDullness = currentStage === 4 || currentStage === 5;
  const showDistraction = currentStage === 4 || currentStage === 6;
  const availableObstacleTags = obstacleTagsForStage(currentStage);

  return (
    <MobileFormScreen
      footer={
        <View className="gap-2">
          <Button onPress={() => void handleSave(false)} disabled={saveMutation.isPending}>
            <Text>{t("module.session.save")}</Text>
          </Button>
          <Button
            onPress={() => void handleSave(true)}
            variant="ghost"
            disabled={saveMutation.isPending}
          >
            <Text>{t("module.session.skip")}</Text>
          </Button>
        </View>
      }
    >
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
              <Text className="text-sm font-semibold">{t("stages.s2.prompts.wanderingCount")}</Text>
              <View
                accessibilityLabel={t("stages.s2.prompts.wanderingCount")}
                accessibilityRole="radiogroup"
                className="flex-row gap-2"
                role="radiogroup"
              >
                {MIND_WANDERING_OPTIONS.map((n, index) => {
                  const onPress = () => setMindWandering(mindWandering === n ? null : n);
                  return (
                    <Pressable
                      key={n}
                      accessibilityRole="radio"
                      aria-checked={mindWandering === n}
                      onPress={onPress}
                      role="radio"
                      className={cn(
                        "size-10 items-center justify-center rounded-full border",
                        mindWandering === n
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                      {...mindWanderingRoving.getItemProps(index, onPress)}
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
                  );
                })}
              </View>
            </View>
          ) : null}

          {showDullness ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold">{t("module.session.dullnessLabel")}</Text>
              <View
                accessibilityLabel={t("module.session.dullnessLabel")}
                accessibilityRole="radiogroup"
                className="flex-row gap-2"
                role="radiogroup"
              >
                {DULLNESS_OPTIONS.map((level, index) => {
                  const onPress = () => setDullness(dullness === level ? null : level);
                  return (
                    <Pressable
                      key={level}
                      accessibilityRole="radio"
                      aria-checked={dullness === level}
                      onPress={onPress}
                      role="radio"
                      className={cn(
                        "flex-1 items-center rounded-md border px-3 py-2",
                        dullness === level
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                      {...dullnessRoving.getItemProps(index, onPress)}
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
                  );
                })}
              </View>
            </View>
          ) : null}

          {showDistraction ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold">{t("module.session.distractionLabel")}</Text>
              <View
                accessibilityLabel={t("module.session.distractionLabel")}
                accessibilityRole="radiogroup"
                className="flex-row gap-2"
                role="radiogroup"
              >
                {DISTRACTION_OPTIONS.map((level, index) => {
                  const onPress = () => setDistraction(distraction === level ? null : level);
                  return (
                    <Pressable
                      key={level}
                      accessibilityRole="radio"
                      aria-checked={distraction === level}
                      onPress={onPress}
                      role="radio"
                      className={cn(
                        "flex-1 items-center rounded-md border px-3 py-2",
                        distraction === level
                          ? "border-primary bg-primary"
                          : "border-border bg-card active:bg-muted",
                      )}
                      {...distractionRoving.getItemProps(index, onPress)}
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
                  );
                })}
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
                      {...toggleButtonStateProps(selected)}
                      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
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
            <View
              accessibilityLabel={t("module.session.moodLabel")}
              accessibilityRole="radiogroup"
              className="flex-row flex-wrap gap-1.5"
              role="radiogroup"
            >
              {MOOD_OPTIONS.map((n, index) => {
                const onPress = () => setMoodAfter(moodAfter === n ? null : n);
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="radio"
                    aria-checked={moodAfter === n}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={onPress}
                    role="radio"
                    className={cn(
                      "size-9 items-center justify-center rounded-full border",
                      moodAfter === n
                        ? "border-primary bg-primary"
                        : "border-border bg-card active:bg-muted",
                    )}
                    {...moodRoving.getItemProps(index, onPress)}
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
                );
              })}
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
        </View>
      </View>
    </MobileFormScreen>
  );
}
