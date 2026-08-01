import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ContentSheet } from "@/src/components/app/content-sheet";
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
import { MeditationPracticesSection } from "@/src/features/meditation/meditation-practices-section";
import {
  useMeditationMedianMinutes,
  useMeditationProgramState,
  useMeditationSessions,
  useMeditationSessionCount,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { median } from "@/src/features/meditation/median";
import { getStage } from "@/src/features/meditation/stages";
import type { MeditationSession, StageNumber } from "@/src/features/meditation/types";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import {} from "@/src/features/modules/types";
import { useSession } from "@/src/providers/session-provider";
import { parseHHmm } from "@/src/utils/time";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { formatAtOffset } from "@/src/utils/date";

export default function MeditationHomeScreen() {
  const { t } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { practice } = useLocalSearchParams<{ practice?: string }>();

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: programState } = useMeditationProgramState(userId);
  const { data: allSessions } = useMeditationSessions(userId, 200);
  // Exact lifetime total for the hero - the list above is capped at 200, so its length
  // would freeze the displayed "sessions" count once a user passes that many.
  const { data: totalSessions } = useMeditationSessionCount(userId);
  // Exact lifetime median for the hero, same reason: a median taken over the capped list
  // is a median of the newest 200 sits, which a daily meditator passes in under seven
  // months - and unlike a rolling window, nothing in the label says so (#337).
  const { data: serverMedianMinutes } = useMeditationMedianMinutes(userId);
  const sessions = allSessions?.slice(0, 5);

  const upsertProgramState = useUpsertMeditationProgramState(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [forceInfo, setForceInfo] = useState(false);
  const [forceWizard, setForceWizard] = useState(false);

  const currentStage = (programState?.currentStage ?? 1) as StageNumber;
  const stage = getStage(currentStage);
  const suggestedDuration = programState?.preferredDurationMinutes ?? 15;
  // The loaded sessions only stand in until the server median arrives (undefined while
  // loading); once it does it wins, including a genuine null for "no sessions yet".
  const medianMinutes =
    serverMedianMinutes !== undefined
      ? serverMedianMinutes
      : median((allSessions ?? []).map((s) => s.durationMinutes));

  // "Last sat" derives from the session window the screen already queries; scan
  // for the latest completedAt rather than trusting order (grounding precedent).
  // The whole session is kept, not just the instant, because the label renders
  // in the frame the sit was captured in (#433 §3).
  const lastSession = (allSessions ?? []).reduce<MeditationSession | null>(
    (latest, s) => (latest === null || s.completedAt > latest.completedAt ? s : latest),
    null,
  );
  const lastWhen = lastSession
    ? formatAtOffset(lastSession.completedAt, lastSession.completedOffsetMinutes)
    : null;
  // `allSessions` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim "no
  // sessions yet", or a returning user's history reads as erased (#320).
  const subline = lastWhen
    ? t("hero.last", { when: lastWhen })
    : allSessions
      ? t("hero.never")
      : undefined;

  async function handleOnboardingComplete(result: MeditationOnboardingResult) {
    if (!preferences || !userId) return;
    setOnboardingError(undefined);
    const preferredTime = parseHHmm(result.preferredTimeOfDay) ?? { hour: 7, minute: 0 };
    try {
      await upsertProgramState.mutateAsync({
        currentStage: result.assessedStage,
        assessedStage: result.assessedStage,
        onboardingCompletedAt: new Date().toISOString(),
        preferredDurationMinutes: result.preferredDurationMinutes,
        preferredTimeOfDay: result.preferredTimeOfDay,
      });
      await updatePreferences.mutateAsync({
        meditationOnboardingCompleted: true,
        meditationRemindersEnabled: result.remindersEnabled,
        meditationReminderHour: preferredTime.hour,
        meditationReminderMinute: preferredTime.minute,
        enabledModules: addModule(preferences.enabledModules, "meditation"),
      });
      setForceWizard(false);
    } catch (error) {
      const fallback = t("onboarding.commit.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  if (prefsLoading) {
    return (
      // The loading return takes the pour too, or the iris room drops out while
      // preferences resolve and snaps in afterwards (the grounding lesson).
      <SafeAreaView className="flex-1 items-center justify-center bg-background" style={roomStyle}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <MeditationInfo
        visible={forceInfo}
        onComplete={() => setForceInfo(false)}
        onDismiss={() => setForceInfo(false)}
      />
      <MeditationOnboarding
        visible={forceWizard}
        isPending={upsertProgramState.isPending || updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={(result) => void handleOnboardingComplete(result)}
        onDismiss={forceWizard ? () => setForceWizard(false) : undefined}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          {/* The field + sheet escape the scroll padding so the iris field runs
              edge to edge; the sheet re-adds the inset for its sections. */}
          <View className="-mx-4 -mt-4">
            <ModuleHomeHeader
              variant="field"
              addWidgetCategory="meditation"
              title={t("module.home.title")}
              hue="iris"
              icon="self-improvement"
              moduleLabel={null}
              tourScope="meditation"
              description={t("module.home.subtitle")}
              actions={[
                { type: "tune", onPress: () => setForceWizard(true) },
                { type: "notifications", targetKey: "meditation" },
                { type: "info", onPress: () => setForceInfo(true) },
              ]}
              meta={
                <ToolStats
                  tone="onField"
                  accentClassName="text-primary-ink"
                  subline={subline}
                  sublineTone={lastWhen ? "accent" : "muted"}
                  items={[
                    { value: `${t("hero.stage")} ${stage.number}`, label: "" },
                    {
                      value: t("hero.sessions", {
                        count: totalSessions ?? (allSessions ?? []).length,
                      }),
                      label: "",
                    },
                    {
                      value:
                        medianMinutes !== null ? t("hero.minutes", { count: medianMinutes }) : "-",
                      label: t("hero.median"),
                    },
                  ]}
                />
              }
            />

            <ContentSheet className="px-4">
              <View className="gap-6">
                <Card variant="soft">
                  <CardContent className="gap-3 pt-6">
                    <CardTitle aria-level={2}>{t("module.home.todayCard")}</CardTitle>
                    <TimerWidget initialDuration={suggestedDuration} />
                  </CardContent>
                </Card>

                <View className="flex-row flex-wrap gap-3">
                  <NavCallout
                    label={t("module.home.openStages")}
                    onPress={() => router.push("/tools/meditation/stages")}
                  />
                  <NavCallout
                    label={t("module.home.openLearn")}
                    onPress={() => router.push("/tools/meditation/learn")}
                  />
                </View>

                <MeditationPracticesSection initialPractice={practice} />

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
                        <Text className="text-sm text-primary-ink">
                          {t("module.home.viewHistory")}
                        </Text>
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
                              {formatAtOffset(s.completedAt, s.completedOffsetMinutes)}
                            </Text>
                          </View>
                          <View className="rounded-full bg-muted px-2 py-0.5">
                            <Text className="text-xs font-semibold text-primary-ink">
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
            </ContentSheet>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function addModule<T extends string>(modules: T[], key: T): T[] {
  return modules.includes(key) ? modules : [...modules, key];
}

/**
 * The stages / learn callouts. They were bordered outline buttons before the
 * room; inside it they read as soft room residents like every other card on the
 * screen. Navigation, not a form control, so the iris accent applies here -
 * `primary` stays reserved for interactive control states.
 */
function NavCallout({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-w-[160px] flex-1 active:opacity-80"
    >
      <Card variant="soft" className="flex-row items-center justify-between gap-3 px-4 py-4">
        <Text className="flex-1 text-sm font-semibold">{label}</Text>
        <Icon name="chevron-right" size={20} className="text-muted-foreground" />
      </Card>
    </Pressable>
  );
}
