import { Audio } from "expo-av";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { cn } from "@/lib/utils";
import {
  useMeditationProgramState,
  useSaveMeditationSession,
} from "@/src/features/meditation/queries";
import { getStage } from "@/src/features/meditation/stages";
import type { DullnessLevel, StageNumber, TmiTechnique } from "@/src/features/meditation/types";
import { useSession } from "@/src/providers/session-provider";

const BELL_ASSET = require("@/assets/sounds/bell.wav");

const DURATION_PRESETS = [10, 15, 20, 30];

type Phase = "preSit" | "running" | "paused" | "completed";

const DULLNESS_OPTIONS: DullnessLevel[] = ["none", "subtle", "strong"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function playBell() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(BELL_ASSET, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    Vibration.vibrate([0, 200, 100, 200]);
  }
}

export default function MeditationSessionScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: programState } = useMeditationProgramState(userId);
  const saveMutation = useSaveMeditationSession(userId);

  const currentStage: StageNumber = (programState?.currentStage ?? 1) as StageNumber;
  const stage = getStage(currentStage);
  const initialDuration = programState?.preferredDurationMinutes ?? 15;

  const [phase, setPhase] = useState<Phase>("preSit");
  const [durationMinutes, setDurationMinutes] = useState(initialDuration);
  const [secondsLeft, setSecondsLeft] = useState(initialDuration * 60);
  const [technique, setTechnique] = useState<TmiTechnique>(stage.suggestedTechniques[0]);
  const [reflection, setReflection] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [dullness, setDullness] = useState<DullnessLevel | null>(null);
  const [mindWandering, setMindWandering] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "preSit") setSecondsLeft(durationMinutes * 60);
  }, [durationMinutes, phase]);

  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPhase("completed");
            void playBell();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  function start() {
    void playBell();
    setPhase("running");
  }
  function pause() {
    setPhase("paused");
  }
  function resume() {
    setPhase("running");
  }
  function reset() {
    setPhase("preSit");
    setSecondsLeft(durationMinutes * 60);
  }

  function handleSave(skipReflection: boolean) {
    saveMutation.mutate(
      {
        stageAtSession: currentStage,
        durationMinutes,
        techniqueUsed: technique,
        reflection: skipReflection ? "" : reflection,
        moodAfter: skipReflection ? null : moodAfter,
        dullnessLevel: skipReflection ? null : dullness,
        mindWanderingEpisodes: skipReflection ? null : mindWandering,
      },
      {
        onSettled: () => router.replace("/modules/meditation"),
      },
    );
  }

  const progressFraction = phase === "completed" ? 1 : 1 - secondsLeft / (durationMinutes * 60);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h2">{t("module.session.title")}</Text>
            </View>
            <Text variant="muted">
              {t("module.session.preSitSubtitle", { stage: currentStage })}
            </Text>
          </View>

          {phase === "preSit" ? (
            <PreSit
              stageNumber={currentStage}
              technique={technique}
              onTechniqueChange={setTechnique}
              suggestedTechniques={stage.suggestedTechniques}
              durationMinutes={durationMinutes}
              onDurationChange={setDurationMinutes}
              onStart={start}
            />
          ) : null}

          {phase === "running" || phase === "paused" ? (
            <TimerFace
              secondsLeft={secondsLeft}
              progressFraction={progressFraction}
              phase={phase}
              onPause={pause}
              onResume={resume}
              onReset={reset}
            />
          ) : null}

          {phase === "completed" ? (
            <PostSit
              stageNumber={currentStage}
              durationMinutes={durationMinutes}
              reflection={reflection}
              onReflectionChange={setReflection}
              moodAfter={moodAfter}
              onMoodChange={setMoodAfter}
              dullness={dullness}
              onDullnessChange={setDullness}
              mindWandering={mindWandering}
              onMindWanderingChange={setMindWandering}
              onSave={() => handleSave(false)}
              onSkip={() => handleSave(true)}
              isPending={saveMutation.isPending}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PreSitProps {
  stageNumber: StageNumber;
  technique: TmiTechnique;
  onTechniqueChange: (t: TmiTechnique) => void;
  suggestedTechniques: TmiTechnique[];
  durationMinutes: number;
  onDurationChange: (n: number) => void;
  onStart: () => void;
}

function PreSit({
  stageNumber,
  technique,
  onTechniqueChange,
  suggestedTechniques,
  durationMinutes,
  onDurationChange,
  onStart,
}: PreSitProps) {
  const { t } = useTranslation("meditation");
  return (
    <View className="gap-4">
      <Card>
        <CardContent className="gap-3 pt-6">
          <CardTitle>{t("module.session.preSitTitle")}</CardTitle>
          <Text variant="muted">{t(`module.session.stageNote.s${stageNumber}`)}</Text>
        </CardContent>
      </Card>

      {suggestedTechniques.length > 1 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold">{t("module.session.techniqueLabel")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {suggestedTechniques.map((tech) => (
              <Pressable
                key={tech}
                accessibilityRole="button"
                accessibilityState={{ selected: technique === tech }}
                onPress={() => onTechniqueChange(tech)}
                className={cn(
                  "rounded-full border px-4 py-2",
                  technique === tech
                    ? "border-primary bg-primary"
                    : "border-border bg-card active:bg-muted",
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    technique === tech ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {t(`module.session.technique.${tech}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("duration.label")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {DURATION_PRESETS.map((min) => (
            <Pressable
              key={min}
              accessibilityRole="button"
              accessibilityState={{ selected: durationMinutes === min }}
              onPress={() => onDurationChange(min)}
              className={cn(
                "rounded-full border px-4 py-2",
                durationMinutes === min
                  ? "border-primary bg-primary"
                  : "border-border bg-card active:bg-muted",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  durationMinutes === min ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {t("duration.minutes", { count: min })}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button onPress={onStart} size="lg">
        <Text>{t("timer.start")}</Text>
      </Button>
    </View>
  );
}

interface TimerFaceProps {
  secondsLeft: number;
  progressFraction: number;
  phase: Exclude<Phase, "preSit" | "completed">;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

function TimerFace({
  secondsLeft,
  progressFraction,
  phase,
  onPause,
  onResume,
  onReset,
}: TimerFaceProps) {
  const { t } = useTranslation("meditation");
  return (
    <View className="items-center gap-6 py-8">
      <View className="size-56 items-center justify-center rounded-full border-4 border-border">
        <View
          className="absolute inset-0 rounded-full border-4 border-primary"
          style={{
            opacity: progressFraction > 0 ? 1 : 0,
            transform: [{ scale: 0.98 + progressFraction * 0.02 }],
          }}
        />
        <Text className="text-5xl font-bold tabular-nums">{formatTime(secondsLeft)}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        {phase === "running" ? (
          <>
            <Button onPress={onPause} variant="outline" size="lg" className="min-w-[120px]">
              <Text>{t("timer.pause")}</Text>
            </Button>
            <Button onPress={onReset} variant="ghost" size="lg">
              <Text>{t("timer.reset")}</Text>
            </Button>
          </>
        ) : (
          <>
            <Button onPress={onResume} size="lg" className="min-w-[120px]">
              <Text>{t("timer.resume")}</Text>
            </Button>
            <Button onPress={onReset} variant="ghost" size="lg">
              <Text>{t("timer.reset")}</Text>
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

interface PostSitProps {
  stageNumber: StageNumber;
  durationMinutes: number;
  reflection: string;
  onReflectionChange: (s: string) => void;
  moodAfter: number | null;
  onMoodChange: (n: number | null) => void;
  dullness: DullnessLevel | null;
  onDullnessChange: (d: DullnessLevel | null) => void;
  mindWandering: number | null;
  onMindWanderingChange: (n: number | null) => void;
  onSave: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function PostSit({
  stageNumber,
  durationMinutes,
  reflection,
  onReflectionChange,
  moodAfter,
  onMoodChange,
  dullness,
  onDullnessChange,
  mindWandering,
  onMindWanderingChange,
  onSave,
  onSkip,
  isPending,
}: PostSitProps) {
  const { t } = useTranslation("meditation");
  const showMindWandering = stageNumber === 2 || stageNumber === 3;
  const showDullness = stageNumber === 4 || stageNumber === 5;

  return (
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
          <View className="flex-row gap-2">
            {[0, 1, 2, 3, 5, 8].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityState={{ selected: mindWandering === n }}
                onPress={() => onMindWanderingChange(mindWandering === n ? null : n)}
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
          <Text className="text-sm font-semibold">{t("stages.s5.prompts.vivid")}</Text>
          <View className="flex-row gap-2">
            {DULLNESS_OPTIONS.map((level) => (
              <Pressable
                key={level}
                accessibilityRole="button"
                accessibilityState={{ selected: dullness === level }}
                onPress={() => onDullnessChange(dullness === level ? null : level)}
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
                  {level}
                </Text>
              </Pressable>
            ))}
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
              onPress={() => onMoodChange(moodAfter === n ? null : n)}
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
          onChangeText={onReflectionChange}
          placeholder={t("module.session.reflectionPlaceholder")}
          accessibilityLabel={t("module.session.reflectionLabel")}
          numberOfLines={4}
        />
      </View>

      <View className="gap-2">
        <Button onPress={onSave} disabled={isPending}>
          <Text>{t("module.session.save")}</Text>
        </Button>
        <Button onPress={onSkip} variant="ghost" disabled={isPending}>
          <Text>{t("module.session.skip")}</Text>
        </Button>
      </View>
    </View>
  );
}
