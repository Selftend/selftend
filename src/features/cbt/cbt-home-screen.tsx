import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { PillarCard } from "@/src/components/app/pillar-card";
import { CbtOnboarding } from "@/src/components/app/cbt-onboarding-modal";
import { CbtProgramCard } from "@/src/components/app/cbt-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useGoals } from "@/src/features/goals/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";

type Pillar = "think" | "act" | "be";

interface PillarStrategy {
  key: string;
  route: Href;
  icon: MaterialIconName;
  labelKey: string;
  descKey: string;
}

const PILLAR_STRATEGIES: Record<Pillar, PillarStrategy[]> = {
  think: [
    {
      key: "thoughts",
      route: "/modules/cbt/new",
      icon: "article",
      labelKey: "dashboard.strategies.thoughts",
      descKey: "pillars.strategyDescriptions.thoughts",
    },
    {
      key: "beliefs",
      route: "/modules/cbt/beliefs",
      icon: "anchor",
      labelKey: "dashboard.strategies.beliefs",
      descKey: "pillars.strategyDescriptions.beliefs",
    },
    {
      key: "worry",
      route: "/modules/cbt/worry",
      icon: "psychology",
      labelKey: "dashboard.strategies.worry",
      descKey: "pillars.strategyDescriptions.worry",
    },
    {
      key: "distortions",
      route: "/modules/cbt/learn",
      icon: "menu-book",
      labelKey: "home.distortionGuide",
      descKey: "pillars.strategyDescriptions.distortions",
    },
  ],
  act: [
    {
      key: "goals",
      route: "/modules/cbt/goals",
      icon: "gps-fixed",
      labelKey: "dashboard.strategies.goals",
      descKey: "pillars.strategyDescriptions.goals",
    },
    {
      key: "values",
      route: "/modules/cbt/values",
      icon: "explore",
      labelKey: "dashboard.strategies.values",
      descKey: "pillars.strategyDescriptions.values",
    },
    {
      key: "activities",
      route: "/modules/cbt/activities",
      icon: "directions-run",
      labelKey: "dashboard.strategies.activities",
      descKey: "pillars.strategyDescriptions.activities",
    },
    {
      key: "exposure",
      route: "/modules/cbt/exposure",
      icon: "layers",
      labelKey: "dashboard.strategies.exposure",
      descKey: "pillars.strategyDescriptions.exposure",
    },
    {
      key: "tasks",
      route: "/modules/cbt/tasks",
      icon: "hiking",
      labelKey: "dashboard.strategies.tasks",
      descKey: "pillars.strategyDescriptions.tasks",
    },
    {
      key: "anger",
      route: "/modules/cbt/anger",
      icon: "local-fire-department",
      labelKey: "dashboard.strategies.anger",
      descKey: "pillars.strategyDescriptions.anger",
    },
  ],
  be: [
    {
      key: "selfCare",
      route: "/modules/cbt/self-care",
      icon: "favorite",
      labelKey: "dashboard.strategies.selfCare",
      descKey: "pillars.strategyDescriptions.selfCare",
    },
  ],
};

const REVIEW_LINKS = [
  {
    key: "weeklyReview",
    route: "/modules/cbt/weekly-review",
    icon: "event-available" as MaterialIconName,
    labelKey: "dashboard.strategies.weeklyReview",
    descKey: "pillars.strategyDescriptions.weeklyReview",
  },
  {
    key: "recovery",
    route: "/modules/cbt/recovery",
    icon: "map" as MaterialIconName,
    labelKey: "dashboard.strategies.recovery",
    descKey: "pillars.strategyDescriptions.recovery",
  },
] as const;

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const {
    program,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    advancePhase,
    promptDismissedAt,
    isUpdating: isProgramUpdating,
  } = useCbtProgram(user?.id ?? null);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [graduationDismissed, setGraduationDismissed] = useState(false);
  const [abandonConfirmVisible, setAbandonConfirmVisible] = useState(false);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: recoveryPlan } = useRecoveryPlan(user?.id ?? null);
  const {
    activityMoodLiftByCategory,
    angerPattern,
    beliefReviewSuggestions,
    exerciseMoodLift,
    exposureProgress,
    recurringThoughtSuggestions,
    selfCareTrend,
    slogan,
    topDistortions,
  } = useCbtInsights(user?.id ?? null);

  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const latestRecord = thoughtRecords?.[0] ?? null;
  const personalSlogan = recoveryPlan?.personalSlogan.trim() || slogan;
  const topDistortion = topDistortions[0] ?? null;
  const otherDistortions = topDistortions.slice(1);
  const topRecurringThought = recurringThoughtSuggestions[0] ?? null;
  const hasInsights =
    Boolean(topDistortion) ||
    Boolean(exerciseMoodLift) ||
    activityMoodLiftByCategory.length > 0 ||
    beliefReviewSuggestions.length > 0 ||
    Boolean(topRecurringThought) ||
    Boolean(selfCareTrend) ||
    Boolean(angerPattern) ||
    Boolean(exposureProgress);
  const showProgramCard = program.status !== "not_started" || !promptDismissedAt;

  return (
    <>
      <ConfirmDialog
        visible={abandonConfirmVisible}
        isPending={isProgramUpdating}
        title={t("program.abandonTitle")}
        message={t("program.abandonDescription")}
        confirmLabel={t("program.abandonConfirm")}
        cancelLabel={t("program.abandonCancel")}
        onCancel={() => setAbandonConfirmVisible(false)}
        onConfirm={() => {
          abandonProgram();
          setAbandonConfirmVisible(false);
        }}
      />
      <CbtOnboarding
        onComplete={() => {
          setForceOnboarding(false);
        }}
        onDismiss={() => setForceOnboarding(false)}
        visible={forceOnboarding}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ModuleHomeHeader
              addWidgetCategory="cbt"
              hue="think"
              icon="psychology"
              moduleLabel={t("module.label")}
              title={t("home.title")}
              description={t("home.description")}
              actions={[
                { type: "notifications", targetKey: "cbt" },
                ...(program.status === "not_started"
                  ? [
                      {
                        type: "program" as const,
                        onPress: showProgramPrompt,
                        accessibilityLabel: t("program.showPromptLabel"),
                      },
                    ]
                  : []),
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
            />

            {program.status === "graduated" ? (
              <ProgramGraduation
                namespace="cbt"
                lines={[
                  { n: program.summaryStats.thoughtRecords, key: "program.statThoughtRecords" },
                  { n: program.summaryStats.activitiesCompleted, key: "program.statActivities" },
                  { n: program.summaryStats.goalsSet, key: "program.statGoals" },
                  { n: program.summaryStats.beliefsExamined, key: "program.statBeliefs" },
                ]
                  .filter((stat) => stat.n > 0)
                  .map((stat) => t(stat.key, { count: stat.n }))}
                dismissed={graduationDismissed}
                onDismiss={() => setGraduationDismissed(true)}
                onReplay={replayProgram}
              />
            ) : showProgramCard ? (
              <CbtProgramCard
                program={program}
                isPending={isProgramUpdating}
                onStart={startProgram}
                onAdvance={advancePhase}
                onAbandon={
                  program.status === "in_progress"
                    ? () => setAbandonConfirmVisible(true)
                    : undefined
                }
                onDismissStart={program.status === "not_started" ? dismissProgramPrompt : undefined}
              />
            ) : null}

            {personalSlogan ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.sloganTitle")}</CardTitle>
                  <CardDescription className="italic">{`"${personalSlogan}"`}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {/* Active goals */}
            {activeGoals.length > 0 ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="h3">{t("dashboard.activeGoals")}</Text>
                  <Button
                    onPress={() => router.push("/modules/cbt/goals")}
                    size="sm"
                    variant="ghost"
                  >
                    <Text>{t("dashboard.seeAll")}</Text>
                  </Button>
                </View>
                {activeGoals.map((goal) => (
                  <AccessibleCardLink
                    key={goal.id}
                    title={goal.title}
                    description={t(`goals.domain.${goal.lifeDomain}`)}
                    onPress={() => router.push(`/modules/cbt/goals/${goal.id}`)}
                  />
                ))}
              </View>
            ) : null}

            {/* Insights */}
            {hasInsights ? (
              <View className="gap-3">
                <Text variant="h3">{t("dashboard.insights.title")}</Text>
                {topDistortion ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.topDistortion", {
                          name: t(`distortions.${topDistortion.key}.title`, {
                            defaultValue: topDistortion.key,
                          }),
                          count: topDistortion.count,
                        })}
                      </CardTitle>
                      {otherDistortions.length > 0 ? (
                        <CardDescription>
                          {t("dashboard.insights.topDistortionDetail", {
                            names: otherDistortions
                              .map((distortion) =>
                                t("dashboard.insights.distortionSummaryItem", {
                                  name: t(`distortions.${distortion.key}.title`, {
                                    defaultValue: distortion.key,
                                  }),
                                  count: distortion.count,
                                }),
                              )
                              .join(", "),
                          })}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                ) : null}

                {exerciseMoodLift ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.exerciseMood", {
                          withExercise: exerciseMoodLift.withExercise,
                          withoutExercise: exerciseMoodLift.withoutExercise,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.exerciseMoodDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {beliefReviewSuggestions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.reviewBelief", {
                          count: beliefReviewSuggestions.length,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.reviewBeliefDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {activityMoodLiftByCategory.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("dashboard.insights.activityMoodLift")}</CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.activityMoodLiftDetail", {
                          summary: activityMoodLiftByCategory
                            .map((item) =>
                              t("dashboard.insights.activityMoodLiftItem", {
                                category: t(`activities.category.${item.category}`),
                                lift: item.averageLift,
                                count: item.count,
                              }),
                            )
                            .join(", "),
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {topRecurringThought ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.recurringThought", {
                          thought: topRecurringThought.thought,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.recurringThoughtDetail", {
                          count: topRecurringThought.count,
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {selfCareTrend ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.selfCareTrend", {
                          exerciseDays: selfCareTrend.exerciseDays,
                          totalDays: selfCareTrend.totalDays,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.selfCareTrendDetail", {
                          socialDays: selfCareTrend.socialDays,
                          gratitudeDays: selfCareTrend.gratitudeDays,
                          averageSleep:
                            selfCareTrend.averageSleepHours === null
                              ? t("dashboard.insights.noSleepAverage")
                              : t("dashboard.insights.sleepAverage", {
                                  hours: selfCareTrend.averageSleepHours,
                                }),
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {angerPattern ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.angerPattern", {
                          averageArousal: angerPattern.averageArousal,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.angerPatternDetail", {
                          commonUrge:
                            angerPattern.commonUrge ?? t("dashboard.insights.noCommonUrge"),
                          timeOutsTaken: angerPattern.timeOutsTaken,
                          totalLogs: angerPattern.totalLogs,
                        })}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}

                {exposureProgress ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("dashboard.insights.exposureProgress", {
                          completed: exposureProgress.completed,
                          total: exposureProgress.total,
                        })}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.insights.exposureProgressDetail")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : null}
              </View>
            ) : null}

            {/* Think · Act · Be pillars */}
            <View className="gap-3">
              <View>
                <Text variant="h2" className="text-xl font-bold tracking-tight">
                  {t("pillars.intro")}
                </Text>
                <Text variant="muted" className="mt-1.5 text-sm leading-snug max-w-[62ch]">
                  {t("pillars.introDescription")}
                </Text>
              </View>

              {(["think", "act", "be"] as const).map((pillar) => (
                <PillarCard
                  key={pillar}
                  tint={pillar}
                  letter={t(`pillars.${pillar}.letter`)}
                  title={t(`pillars.${pillar}.title`)}
                  kicker={t(`pillars.${pillar}.sub`)}
                  description={t(`pillars.${pillar}.description`)}
                  onToolPress={(toolKey) => {
                    const strategy = PILLAR_STRATEGIES[pillar].find((s) => s.key === toolKey);
                    if (strategy?.route) router.push(strategy.route);
                  }}
                >
                  {PILLAR_STRATEGIES[pillar].map((strategy) => (
                    <PillarCard.Tool
                      key={strategy.key}
                      toolKey={strategy.key}
                      icon={strategy.icon}
                      name={t(strategy.labelKey)}
                      desc={t(strategy.descKey)}
                    />
                  ))}
                </PillarCard>
              ))}
            </View>

            {/* Review */}
            <View className="gap-3">
              <Text variant="h3">{t("pillars.review.title")}</Text>
              <View className="flex-row flex-wrap gap-3">
                {REVIEW_LINKS.map((link) => (
                  <View key={link.key} className="min-w-[260px] flex-1 basis-[260px]">
                    <Pressable
                      accessibilityHint={t(link.descKey)}
                      accessibilityLabel={t(link.labelKey)}
                      accessibilityRole="button"
                      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                      onPress={() => router.push(link.route)}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
                      role="button"
                    >
                      <View className="size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon name={link.icon} className="size-6 text-foreground" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{t(link.labelKey)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(link.descKey)}
                        </Text>
                      </View>
                      <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent thought record */}
            {latestRecord ? (
              <View className="gap-3">
                <Text variant="h3">{t("dashboard.recentThought")}</Text>
                <AccessibleCardLink
                  title={
                    (latestRecord.nats.find((n) => n.isHotThought) ?? latestRecord.nats[0])?.text ??
                    ""
                  }
                  description={latestRecord.balancedThought}
                  onPress={() =>
                    router.push(
                      `/modules/cbt/history/${latestRecord.id}` as Parameters<
                        typeof router.push
                      >[0],
                    )
                  }
                />
              </View>
            ) : null}

            <Pressable
              accessibilityLabel={t("home.recordHistory")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => router.push("/modules/cbt/history")}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
              role="button"
            >
              <Text className="flex-1 text-sm font-medium">{t("home.recordHistory")}</Text>
              <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
