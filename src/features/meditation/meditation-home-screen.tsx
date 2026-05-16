import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import {
  MeditationOnboarding,
  type MeditationOnboardingResult,
} from "@/src/components/app/meditation-onboarding-modal";
import { cn } from "@/lib/utils";
import {
  useMeditationProgramState,
  useMeditationSessions,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { getStage, STAGES, type StageDefinition } from "@/src/features/meditation/stages";
import type { StageNumber } from "@/src/features/meditation/types";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useSession } from "@/src/providers/session-provider";

export default function MeditationHomeScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: programState } = useMeditationProgramState(userId);
  const { data: sessions } = useMeditationSessions(userId, 5);

  const upsertProgramState = useUpsertMeditationProgramState(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();

  const onboardingNeeded =
    !prefsLoading && Boolean(preferences) && !preferences?.meditationOnboardingCompleted;

  const currentStage = (programState?.currentStage ?? 1) as StageNumber;
  const stage = getStage(currentStage);
  const suggestedDuration = programState?.preferredDurationMinutes ?? 15;
  const phaseLabel = t(`module.home.phase${capitalize(stage.phase)}`);

  async function handleOnboardingComplete(result: MeditationOnboardingResult) {
    if (!preferences || !userId) return;
    setOnboardingError(undefined);
    try {
      await upsertProgramState.mutateAsync({
        currentStage: result.assessedStage,
        assessedStage: result.assessedStage,
        onboardingCompletedAt: new Date().toISOString(),
        preferredDurationMinutes: result.preferredDurationMinutes,
        preferredTimeOfDay: result.preferredTimeOfDay,
      });
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, {
          meditationOnboardingCompleted: true,
          meditationRemindersEnabled: result.remindersEnabled,
          meditationReminderHour: parseHour(result.preferredTimeOfDay),
          meditationReminderMinute: parseMinute(result.preferredTimeOfDay),
          enabledModules: addModule(preferences.enabledModules, "meditation"),
        }),
      );
    } catch {
      setOnboardingError(t("onboarding.commit.error"));
    }
  }

  if (prefsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <MeditationOnboarding
        visible={onboardingNeeded}
        isPending={upsertProgramState.isPending || updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={(result) => void handleOnboardingComplete(result)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("module.home.title")}</Text>
              </View>
              <Text variant="muted">
                {t("module.home.subtitle", { stage: stage.number, phase: phaseLabel })}
              </Text>
            </View>

            <Card className="border-primary/30">
              <CardContent className="gap-3 pt-6">
                <CardTitle>{t("module.home.todayCard")}</CardTitle>
                <Text variant="muted">
                  {t("module.home.todaySuggestion", {
                    minutes: suggestedDuration,
                    stage: stage.number,
                  })}
                </Text>
                <Button onPress={() => router.push("/modules/meditation/session/new")}>
                  <Text>{t("module.home.startSit")}</Text>
                </Button>
              </CardContent>
            </Card>

            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("module.home.stageStripTitle")}
              </Text>
              <StageStrip currentStage={currentStage} />
              <Text variant="muted" className="text-xs">
                {t("module.home.stageStripHint")}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <Button
                variant="outline"
                className="flex-1 min-w-[160px]"
                onPress={() => router.push("/modules/meditation/stages")}
              >
                <Text>{t("module.home.openStages")}</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-w-[160px]"
                onPress={() => router.push("/modules/meditation/learn")}
              >
                <Text>{t("module.home.openLearn")}</Text>
              </Button>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("module.home.recentTitle")}
                </Text>
                {sessions && sessions.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push("/modules/meditation/sessions")}
                  >
                    <Text className="text-sm text-primary">{t("module.home.viewHistory")}</Text>
                  </Pressable>
                ) : null}
              </View>
              {!sessions || sessions.length === 0 ? (
                <Text variant="muted">{t("module.home.noSessions")}</Text>
              ) : (
                <View className="gap-2">
                  {sessions.map((s) => (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/modules/meditation/sessions/[id]",
                          params: { id: s.id },
                        })
                      }
                      className="flex-row items-center justify-between rounded-lg border border-border bg-card p-3 active:bg-accent/40"
                    >
                      <View className="gap-0.5">
                        <Text className="font-semibold">
                          {t("module.sessions.durationLabel", { count: s.durationMinutes })}
                        </Text>
                        <Text variant="muted" className="text-xs">
                          {new Date(s.completedAt).toLocaleString()}
                        </Text>
                      </View>
                      <View className="rounded-full bg-primary/10 px-2 py-0.5">
                        <Text className="text-xs font-semibold text-primary">
                          {t("module.sessions.stageBadge", { stage: s.stageAtSession })}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function StageStrip({ currentStage }: { currentStage: StageNumber }) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {STAGES.map((s: StageDefinition) => (
        <Pressable
          key={s.number}
          accessibilityRole="button"
          accessibilityLabel={`Stage ${s.number}`}
          onPress={() =>
            router.push({
              pathname: "/modules/meditation/stages/[n]",
              params: { n: String(s.number) },
            })
          }
          className={cn(
            "size-9 items-center justify-center rounded-md border",
            s.number === currentStage
              ? "border-primary bg-primary"
              : "border-border bg-card active:bg-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-bold",
              s.number === currentStage ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {s.number}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseHour(time: string): number {
  const [h] = time.split(":");
  const n = Number(h);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 7;
}

function parseMinute(time: string): number {
  const [, m] = time.split(":");
  const n = Number(m);
  return Number.isFinite(n) && n >= 0 && n <= 59 ? n : 0;
}

function addModule<T extends string>(modules: T[], key: T): T[] {
  return modules.includes(key) ? modules : [...modules, key];
}
