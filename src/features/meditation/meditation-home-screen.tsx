import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { MeditationInfo } from "@/src/components/app/meditation-info-modal";
import { TimerWidget } from "@/src/features/timer/timer-widget";
import {
  MeditationOnboarding,
  type MeditationOnboardingResult,
} from "@/src/components/app/meditation-onboarding-modal";
import { MeditationDailyLifeCard } from "@/src/features/meditation/meditation-daily-life-card";
import { MeditationInsightsCard } from "@/src/features/meditation/meditation-insights-card";
import {
  useMeditationProgramState,
  useMeditationSessions,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { median } from "@/src/features/meditation/median";
import { getStage } from "@/src/features/meditation/stages";
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
  const { data: allSessions } = useMeditationSessions(userId, 200);
  const sessions = allSessions?.slice(0, 5);

  const upsertProgramState = useUpsertMeditationProgramState(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [forceInfo, setForceInfo] = useState(false);
  const [forceWizard, setForceWizard] = useState(false);

  const currentStage = (programState?.currentStage ?? 1) as StageNumber;
  const stage = getStage(currentStage);
  const suggestedDuration = programState?.preferredDurationMinutes ?? 15;
  const phaseLabel = t(`module.home.phase${capitalize(stage.phase)}`);
  const medianMinutes = median((allSessions ?? []).map((s) => s.durationMinutes));

  function handleInfoComplete() {
    setForceInfo(false);
  }

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
      setForceWizard(false);
    } catch (error) {
      const fallback = t("onboarding.commit.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
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
      <MeditationInfo
        visible={forceInfo}
        onComplete={handleInfoComplete}
        onDismiss={() => setForceInfo(false)}
      />
      <MeditationOnboarding
        visible={forceWizard}
        isPending={upsertProgramState.isPending || updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={(result) => void handleOnboardingComplete(result)}
        onDismiss={forceWizard ? () => setForceWizard(false) : undefined}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                addWidgetCategory="meditation"
                title={t("module.home.title")}
                hue="iris"
                icon="self-improvement"
                moduleLabel={null}
                description={t("module.home.subtitle", { stage: stage.number, phase: phaseLabel })}
                actions={[
                  { type: "tune", onPress: () => setForceWizard(true) },
                  { type: "notifications", targetKey: "meditation" },
                  { type: "info", onPress: () => setForceInfo(true) },
                ]}
                meta={
                  <ToolStats
                    accentClassName="text-iris"
                    credit={t("authorEyebrow")}
                    items={[
                      { value: `${t("hero.stage")} ${stage.number}`, label: "" },
                      {
                        value: t("hero.sessions", { count: (allSessions ?? []).length }),
                        label: "",
                      },
                      {
                        value:
                          medianMinutes !== null
                            ? t("hero.minutes", { count: medianMinutes })
                            : "–",
                        label: t("hero.median"),
                      },
                    ]}
                  />
                }
              />
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
                <TimerWidget initialDuration={suggestedDuration} />
              </CardContent>
            </Card>

            <View className="flex-row flex-wrap gap-3">
              <Button
                variant="outline"
                className="flex-1 min-w-[160px]"
                onPress={() => router.push("/tools/meditation/stages")}
              >
                <Text>{t("module.home.openStages")}</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-w-[160px]"
                onPress={() => router.push("/tools/meditation/learn")}
              >
                <Text>{t("module.home.openLearn")}</Text>
              </Button>
            </View>

            {currentStage === 10 ? <MeditationDailyLifeCard /> : null}

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("module.home.recentTitle")}
                </Text>
                {sessions && sessions.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push("/tools/meditation/sessions")}
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
                          pathname: "/tools/meditation/sessions/[id]",
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

            {allSessions && allSessions.length > 0 ? (
              <MeditationInsightsCard sessions={allSessions} />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
